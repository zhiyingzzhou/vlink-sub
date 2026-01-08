import { NextResponse } from "next/server";

import { generateClashConfig } from "@/lib/clash/generateClashConfig";
import { sha256Hex } from "@/lib/crypto/hash";
import { encryptRawData } from "@/lib/crypto/rawData";
import { randomCrockfordBase32 } from "@/lib/crypto/tokens";
import { getBearerToken, getUserIdFromJwt } from "@/lib/http/auth";
import { UniversalParser } from "@/lib/parser/UniversalParser";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseExpiresAt(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRlsClient(token);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, name, short_code, expires_at, disabled, download_count, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = getUserIdFromJwt(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; raw?: unknown; templateId?: unknown; expiresAt?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = typeof body.raw === "string" ? body.raw : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const templateId = typeof body.templateId === "string" ? body.templateId : null;
  const expiresAt = parseExpiresAt(body.expiresAt);

  if (!raw.trim()) {
    return NextResponse.json({ error: "raw required" }, { status: 400 });
  }

  const supabase = createSupabaseRlsClient(token);

  let templateSnapshot = "";
  let resolvedTemplateId: string | null = null;
  if (templateId) {
    const { data: tpl, error: tplError } = await supabase
      .from("templates")
      .select("id, content")
      .eq("id", templateId)
      .maybeSingle();

    if (tplError) {
      return NextResponse.json({ error: tplError.message }, { status: 500 });
    }
    if (!tpl) {
      return NextResponse.json({ error: "template not found" }, { status: 404 });
    }
    resolvedTemplateId = tpl.id;
    templateSnapshot = tpl.content;
  }

  const parser = new UniversalParser();
  const report = parser.parseWithReport(raw);
  if (report.nodes.length === 0) {
    return NextResponse.json(
      { error: "no nodes parsed", details: report.errors },
      { status: 400 }
    );
  }

  const yamlText = generateClashConfig(report.nodes, templateSnapshot || null);
  const configHash = sha256Hex(yamlText);

  const encryptedRaw = encryptRawData(raw);

  const shortCodeLen = 8;
  const secretLen = 26;
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const shortCode = randomCrockfordBase32(shortCodeLen);
    const secret = randomCrockfordBase32(secretLen);
    const secretHash = sha256Hex(secret);

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        name: name || "我的订阅",
        raw_data: encryptedRaw,
        template_id: resolvedTemplateId,
        template_snapshot: templateSnapshot,
        config_cache: yamlText,
        config_hash: configHash,
        secret_hash: secretHash,
        short_code: shortCode,
        expires_at: expiresAt,
      })
      .select("id, short_code")
      .single();

    if (!error && data) {
      const url = `${getOrigin(req)}/s/${data.short_code}/${secret}`;
      return NextResponse.json(
        { id: data.id, short_code: data.short_code, secret, url },
        { status: 201 }
      );
    }

    const code = (error as { code?: string } | null)?.code;
    if (code === "23505" && attempt < maxAttempts) {
      continue;
    }
    return NextResponse.json(
      { error: error?.message || "insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "short_code collision, please retry" },
    { status: 503 }
  );
}

