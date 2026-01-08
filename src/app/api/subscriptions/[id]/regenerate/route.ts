import { NextResponse } from "next/server";

import { generateClashConfig } from "@/lib/clash/generateClashConfig";
import { sha256Hex } from "@/lib/crypto/hash";
import { decryptRawData, encryptRawData } from "@/lib/crypto/rawData";
import { getBearerToken } from "@/lib/http/auth";
import { UniversalParser } from "@/lib/parser/UniversalParser";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

function parseExpiresAt(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

type Body = {
  raw?: unknown;
  templateId?: unknown;
  template_id?: unknown;
  name?: unknown;
  disabled?: unknown;
  expiresAt?: unknown;
  expires_at?: unknown;
};

type TemplateDirective =
  | { has: false }
  | { has: true; templateId: string | null };

function readTemplateDirective(body: Body): TemplateDirective | { error: string } {
  const has = "templateId" in body || "template_id" in body;
  if (!has) return { has: false };

  const raw = "templateId" in body ? body.templateId : body.template_id;
  if (raw === null || raw === "" || raw === undefined) return { has: true, templateId: null };
  if (typeof raw === "string") return { has: true, templateId: raw };
  return { error: "invalid templateId" };
}

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const templateDirective = readTemplateDirective(body);
  if ("error" in templateDirective) {
    return NextResponse.json({ error: templateDirective.error }, { status: 400 });
  }

  const hasRaw = "raw" in body;
  if (hasRaw && typeof body.raw !== "string") {
    return NextResponse.json({ error: "invalid raw" }, { status: 400 });
  }

  const hasName = "name" in body;
  if (hasName && typeof body.name !== "string") {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  const hasDisabled = "disabled" in body;
  if (hasDisabled && typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "invalid disabled" }, { status: 400 });
  }

  const hasExpires =
    "expiresAt" in body || "expires_at" in body;
  const expiresRaw = "expiresAt" in body ? body.expiresAt : body.expires_at;
  if (
    hasExpires &&
    !(expiresRaw === null || expiresRaw === "" || expiresRaw === undefined || typeof expiresRaw === "string")
  ) {
    return NextResponse.json({ error: "invalid expiresAt" }, { status: 400 });
  }
  const expiresAt = hasExpires ? parseExpiresAt(expiresRaw) : undefined;

  const supabase = createSupabaseRlsClient(token);

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id, raw_data, template_id, template_snapshot")
    .eq("id", id)
    .maybeSingle();

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const existing = sub as unknown as {
    raw_data?: unknown;
    template_id?: unknown;
    template_snapshot?: unknown;
  };

  const rawFromBody = typeof body.raw === "string" ? body.raw : "";
  const rawText = rawFromBody.trim()
    ? rawFromBody
    : decryptRawData(String(existing.raw_data || ""));

  if (!rawText.trim()) {
    return NextResponse.json({ error: "raw not available" }, { status: 500 });
  }

  let resolvedTemplateId =
    typeof existing.template_id === "string" ? existing.template_id : null;
  let templateSnapshot = String(existing.template_snapshot || "");

  if (templateDirective.has) {
    if (!templateDirective.templateId) {
      resolvedTemplateId = null;
      templateSnapshot = "";
    } else {
      const { data: tpl, error: tplError } = await supabase
        .from("templates")
        .select("id, content")
        .eq("id", templateDirective.templateId)
        .maybeSingle();

      if (tplError) return NextResponse.json({ error: tplError.message }, { status: 500 });
      if (!tpl) return NextResponse.json({ error: "template not found" }, { status: 404 });
      resolvedTemplateId = tpl.id;
      templateSnapshot = tpl.content;
    }
  }

  const report = new UniversalParser().parseWithReport(rawText);
  if (report.nodes.length === 0) {
    return NextResponse.json(
      { error: "no nodes parsed", details: report.errors },
      { status: 400 }
    );
  }

  const yamlText = generateClashConfig(report.nodes, templateSnapshot || null);
  const configHash = sha256Hex(yamlText);

  const patch: Record<string, unknown> = {
    config_cache: yamlText,
    config_hash: configHash,
  };

  if (rawFromBody.trim()) {
    patch.raw_data = encryptRawData(rawFromBody);
  }

  if (templateDirective.has) {
    patch.template_id = resolvedTemplateId;
    patch.template_snapshot = templateSnapshot;
  }

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (hasDisabled) patch.disabled = body.disabled as boolean;
  if (hasExpires) patch.expires_at = expiresAt ?? null;

  const { data, error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, short_code, template_id, template_snapshot, config_hash, expires_at, disabled, download_count, last_downloaded_at, created_at, updated_at"
    )
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ subscription: data }, { status: 200 });
}
