"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ButtonLink } from "@/components/ui/Link";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          theme?: "light" | "dark";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  // 轻量校验：避免明显的无效输入；更严格校验留给 Supabase
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

/**
 * 生成 PKCE verifier/challenge（S256）。
 *
 * 注意：我们会把 verifier 写入 `${storageKey}-code-verifier`，供 callback 页 `exchangeCodeForSession()` 使用。
 */
async function createPkce(): Promise<{ verifier: string; challenge: string; method: "s256" }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64UrlEncode(bytes);
  const challenge = base64UrlEncode(await sha256Bytes(verifier));
  return { verifier, challenge, method: "s256" };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { resolved } = useTheme();

  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<number | null>(null);
  const captchaThemeRef = useRef<"light" | "dark" | null>(null);
  const [captchaLoaded, setCaptchaLoaded] = useState(false);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const hasCaptcha = Boolean(HCAPTCHA_SITE_KEY);
  const captchaTheme: "light" | "dark" = resolved === "dark" ? "dark" : "light";

  // 兜底：如果脚本在 hydration 前就已加载（或缓存命中导致 onLoad 丢失），这里同步检测一下全局变量。
  useEffect(() => {
    if (!hasCaptcha) return;
    if (captchaLoaded) return;
    if (window.hcaptcha) setCaptchaLoaded(true);
  }, [captchaLoaded, hasCaptcha]);

  useEffect(() => {
    if (!hasCaptcha) return;
    if (!captchaLoaded) return;
    if (!captchaContainerRef.current) return;
    if (!window.hcaptcha) return;
    if (captchaWidgetIdRef.current !== null && captchaThemeRef.current === captchaTheme) return;

    // 切换主题时，重新渲染验证码（iframe 内部无法用 CSS 直接跟随站点主题）。
    try {
      const remove = (window.hcaptcha as unknown as { remove?: (widgetId: number) => void }).remove;
      if (remove && captchaWidgetIdRef.current !== null) remove(captchaWidgetIdRef.current);
    } catch {
      // ignore
    }
    captchaContainerRef.current.innerHTML = "";
    captchaWidgetIdRef.current = null;
    captchaThemeRef.current = null;
    setCaptchaToken("");

    captchaWidgetIdRef.current = window.hcaptcha.render(captchaContainerRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      theme: captchaTheme,
      callback: (token: string) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
    });
    captchaThemeRef.current = captchaTheme;
  }, [captchaLoaded, captchaTheme, hasCaptcha]);

  // 发送 Supabase Magic Link：用户点击邮件中的链接后跳转到 /auth/callback 建立 session。
  const onSend = async () => {
    setHint("");
    setError("");
    const value = email.trim();
    if (!value) {
      setError("请输入邮箱");
      return;
    }
    if (!isValidEmail(value)) {
      setError("邮箱格式不正确");
      return;
    }

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Supabase 未配置");
      return;
    }

    if (hasCaptcha && !captchaToken) {
      setError("请先完成验证码");
      return;
    }

    // 生成 PKCE 并写入 code_verifier（callback 页会读取）
    let pkce: { verifier: string; challenge: string; method: "s256" };
    try {
      pkce = await createPkce();
      const storageKey =
        (supabase.auth as unknown as { storageKey?: unknown }).storageKey;
      if (typeof storageKey !== "string" || !storageKey) {
        throw new Error("storageKey missing");
      }
      localStorage.setItem(`${storageKey}-code-verifier`, pkce.verifier);
    } catch {
      setError("浏览器环境不支持 PKCE，请关闭隐私模式或更换浏览器重试");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          redirectTo: `${window.location.origin}/auth/callback`,
          codeChallenge: pkce.challenge,
          codeChallengeMethod: pkce.method,
          captchaToken: captchaToken || undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; retryAfter?: number }
        | null;
      if (!res.ok || !json?.ok) {
        const retry = typeof json?.retryAfter === "number" ? json.retryAfter : null;
        const msg = json?.error || "发送失败";
        const suffix = retry ? `（请 ${retry} 秒后再试）` : "";
        setError(msg + suffix);
        toast.error("发送失败", msg);
        return;
      }
      setHint("已发送登录链接，请检查邮箱完成登录。");
      toast.success("已发送邮件", "请在邮箱中点击登录链接完成登录");

      if (hasCaptcha && captchaWidgetIdRef.current !== null) {
        try {
          window.hcaptcha?.reset(captchaWidgetIdRef.current);
        } catch {
          // ignore
        }
        setCaptchaToken("");
      }
    } catch {
      setError("发送失败，请稍后重试");
      toast.error("发送失败", "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingShell>
      <div className="mx-auto grid max-w-xl gap-6">
        <PageHeader
          badge={<Badge tone="primary">Supabase Auth · Magic Link</Badge>}
          title="登录 / 注册"
          description="输入邮箱，我们会发送一次性登录链接到你的邮箱，点击即可完成登录。"
          actions={
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              返回控制台
            </ButtonLink>
          }
        />

        <Card tone="neutral">
          <CardTitle>邮箱登录</CardTitle>
          <CardDescription>
            登录链接会跳转到 <span className="font-mono">/auth/callback</span>{" "}
            完成 session 建立。
          </CardDescription>

          <div className="mt-6 grid gap-3">
            <div>
              <Label requiredMark>邮箱</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            {hasCaptcha ? (
              <>
                <div
                  ref={captchaContainerRef}
                  className="flex min-h-[84px] items-center justify-center"
                >
                  {captchaLoadError ? (
                    <div className="text-sm text-destructive">{captchaLoadError}</div>
                  ) : captchaLoaded ? null : (
                    <div className="text-sm text-muted-foreground">验证码加载中…</div>
                  )}
                </div>
                <Script
                  // 仅在配置了 site key 时加载（降低无关流量）
                  src="https://js.hcaptcha.com/1/api.js?render=explicit"
                  strategy="afterInteractive"
                  onLoad={() => {
                    setCaptchaLoaded(true);
                    setCaptchaLoadError("");
                  }}
                  onError={() => {
                    setCaptchaLoadError("验证码加载失败，请检查网络或关闭广告拦截后重试");
                  }}
                />
              </>
            ) : null}

            <Button onClick={onSend} disabled={loading}>
              {loading ? "发送中…" : "发送登录链接"}
            </Button>

            {error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : null}
            {hint ? (
              <div className="text-sm text-muted-foreground">{hint}</div>
            ) : null}
          </div>
        </Card>
      </div>
    </MarketingShell>
  );
}
