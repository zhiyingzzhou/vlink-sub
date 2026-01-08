import "server-only";

import { NextResponse } from "next/server";

import { isCrockfordBase32, normalizeCrockfordBase32 } from "@/lib/crypto/tokens";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rateLimit";

type ExportRow = {
  id: string;
  config_cache: string | null;
  config_hash: string | null;
  expires_at: string | null;
  disabled: boolean | null;
};

function envNumber(name: string, fallback: number): number {
  const raw = (process.env[name] || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function isTruthy(input: string | null): boolean {
  const v = (input || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function maybeBumpDownloadCount(subscriptionId: string) {
  const minIntervalSeconds = Math.max(
    0,
    Math.floor(envNumber("DOWNLOAD_COUNT_MIN_INTERVAL_SECONDS", 600))
  );

  Promise.resolve()
    .then(async () => {
      const admin = createSupabaseAdminClient();
      await admin.rpc("increment_subscription_download_count", {
        subscription_id: subscriptionId,
        min_interval_seconds: minIntervalSeconds,
      });
    })
    .catch(() => {
      // ignore（统计为近似值，不影响主链路）
    });
}

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

export async function handleSubscriptionExport(
  req: Request,
  shortCodeInput: string,
  secretInput: string | null
) {
  const shortCode = normalizeCrockfordBase32(shortCodeInput);
  const secret = secretInput ? normalizeCrockfordBase32(secretInput) : "";

  if (!isCrockfordBase32(shortCode, 8, 10)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!secret || !isCrockfordBase32(secret, 20, 64)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`sub_export:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    });
  }

  const supabase = createSupabasePublicClient();
  const ifNoneMatch = req.headers.get("if-none-match");
  const { data, error } = await supabase
    .rpc("get_subscription_export", {
      p_short_code: shortCode,
      p_secret: secret,
      p_if_none_match: ifNoneMatch,
    })
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const row = data as unknown as ExportRow;

  if (row.disabled) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const expiresAt =
    row.expires_at && !Number.isNaN(Date.parse(row.expires_at))
      ? new Date(row.expires_at)
      : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return new NextResponse("订阅已过期", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const configHash = String(row.config_hash || "");
  if (!configHash) {
    return NextResponse.json({ error: "not ready" }, { status: 503 });
  }

  const reqUrl = new URL(req.url);
  const wantDownload = isTruthy(reqUrl.searchParams.get("download"));

  const etag = `"${configHash}"`;
  const contentType = wantDownload
    ? "text/yaml; charset=utf-8"
    : "text/plain; charset=utf-8";
  const baseHeaders = {
    ETag: etag,
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Type": contentType,
    "Content-Disposition": wantDownload
      ? `attachment; filename=\"vlink-hub-${shortCode}.yaml\"`
      : `inline; filename=\"vlink-hub-${shortCode}.yaml\"`,
    "Subscription-Userinfo": `upload=0; download=0; total=1099511627776; expire=${
      expiresAt ? Math.floor(expiresAt.getTime() / 1000) : 253402300799
    }`,
  };

  if (row.config_cache === null) {
    const inm = ifNoneMatch || "";
    if (inm && inm.includes(etag)) {
      maybeBumpDownloadCount(row.id);
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }
    return NextResponse.json({ error: "not ready" }, { status: 503 });
  }

  const configText = String(row.config_cache);
  if (!configText) {
    return NextResponse.json({ error: "not ready" }, { status: 503 });
  }

  maybeBumpDownloadCount(row.id);
  return new NextResponse(configText, { status: 200, headers: baseHeaders });
}
