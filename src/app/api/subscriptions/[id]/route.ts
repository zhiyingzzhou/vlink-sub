import { NextResponse } from "next/server";

import { getBearerToken } from "@/lib/http/auth";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 单个订阅的 CRUD（控制台用）。
 *
 * - `GET`：读取订阅详情（不含密文 raw / YAML 文本）。
 * - `PATCH`：更新 name/disabled/expires_at 等元信息。
 * - `DELETE`：删除订阅。
 *
 * 注：raw/config 有单独的 API（`/raw`、`/config`、`/regenerate`、`/rotate-secret`）。
 */
type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function GET(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !isUuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseRlsClient(token);
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, name, short_code, template_id, template_snapshot, config_hash, expires_at, disabled, download_count, last_downloaded_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ subscription: data }, { status: 200 });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !isUuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; expires_at?: unknown; disabled?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.disabled === "boolean") patch.disabled = body.disabled;
  if (body.expires_at === null || body.expires_at === "" || body.expires_at === undefined) {
    // 永久：明确传入 null/空字符串时将 expires_at 写为 null
    if ("expires_at" in body) patch.expires_at = null;
  } else if (typeof body.expires_at === "string") {
    const ms = Date.parse(body.expires_at);
    if (!Number.isNaN(ms)) patch.expires_at = new Date(ms).toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const supabase = createSupabaseRlsClient(token);
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

export async function DELETE(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !isUuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseRlsClient(token);
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
