import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 发送 Supabase Magic Link（OTP）并做基础防刷。
 *
 * 背景：`NEXT_PUBLIC_SUPABASE_ANON_KEY` 暴露在前端，任何人都能直接调用 Supabase `/otp` 接口触发发信；
 * 因此“根治”防刷需要在 Supabase 侧启用 Captcha / Rate Limit。本接口提供：
 * - 站内限流（IP / email / IP+email）避免被无脑刷爆
 * - 可选透传 `captchaToken` 到 Supabase（配合 Supabase Dashboard 开启 Captcha）
 *
 * 注意：限流为内存实现（单实例），多实例部署建议接入 Redis/WAF/边缘限流。
 */
type Body = {
  email?: unknown;
  redirectTo?: unknown;
  codeChallenge?: unknown;
  codeChallengeMethod?: unknown;
  captchaToken?: unknown;
};

/** 读取数字型环境变量；缺失/非法值回退到默认值。 */
function envNumber(name: string, fallback: number): number {
  const raw = (process.env[name] || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/** 生成 origin（兼容反向代理的 x-forwarded-*）。 */
function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

/** 从常见反代/Cloudflare 头里提取客户端 IP（用于限流 key）。 */
function getClientIp(req: Request): string {
  const headers = req.headers;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  // 轻量校验：避免明显的无效输入；更严格校验留给 Supabase
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeRedirectTo(req: Request, input: unknown): string {
  const origin = getOrigin(req);
  const fallback = `${origin}/auth/callback`;

  if (typeof input !== "string") return fallback;
  try {
    const url = new URL(input, origin);
    if (url.origin !== origin) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const codeChallenge = typeof body.codeChallenge === "string" ? body.codeChallenge : "";
  const codeChallengeMethod =
    typeof body.codeChallengeMethod === "string" ? body.codeChallengeMethod : "";
  if (!codeChallenge || !codeChallengeMethod) {
    return NextResponse.json({ error: "missing pkce params" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const windowMs = Math.max(10_000, Math.floor(envNumber("AUTH_OTP_WINDOW_SECONDS", 600) * 1000));
  const ipLimit = Math.max(1, Math.floor(envNumber("AUTH_OTP_LIMIT_PER_IP", 12)));
  const emailLimit = Math.max(1, Math.floor(envNumber("AUTH_OTP_LIMIT_PER_EMAIL", 4)));
  const ipEmailLimit = Math.max(1, Math.floor(envNumber("AUTH_OTP_LIMIT_PER_IP_EMAIL", 3)));

  const rlIp = rateLimit(`auth_otp:ip:${ip}`, ipLimit, windowMs);
  const rlEmail = rateLimit(`auth_otp:email:${email}`, emailLimit, windowMs);
  const rlIpEmail = rateLimit(`auth_otp:ip_email:${ip}:${email}`, ipEmailLimit, windowMs);

  if (!rlIp.allowed || !rlEmail.allowed || !rlIpEmail.allowed) {
    const resetAt = Math.max(rlIp.resetAt, rlEmail.resetAt, rlIpEmail.resetAt);
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const supabaseUrl =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
  }

  const redirectTo = safeRedirectTo(req, body.redirectTo);
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/otp`);
  url.searchParams.set("redirect_to", redirectTo);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      email,
      create_user: true,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      ...(captchaToken ? { gotrue_meta_security: { captcha_token: captchaToken } } : {}),
    }),
  });

  if (res.ok) {
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  const errJson = (await res.json().catch(() => null)) as
    | { msg?: unknown; error_description?: unknown; error?: unknown }
    | null;
  const message =
    (typeof errJson?.msg === "string" && errJson.msg) ||
    (typeof errJson?.error_description === "string" && errJson.error_description) ||
    (typeof errJson?.error === "string" && errJson.error) ||
    "发送失败";

  // 透传 Supabase 的状态码（常见：400/401/429），便于前端友好提示。
  return NextResponse.json({ error: message }, { status: res.status || 500 });
}
