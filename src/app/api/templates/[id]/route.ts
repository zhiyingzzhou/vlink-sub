import { NextResponse } from "next/server";

import { getBearerToken } from "@/lib/http/auth";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 单个模板读写 API。
 *
 * - `GET`：未登录也可读公共模板；登录时也可读自己/公开模板。
 * - `PATCH/DELETE`：需要 Bearer token；权限由 Supabase RLS 控制（只有 owner 可写）。
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
  const supabase = token
    ? createSupabaseRlsClient(token)
    : createSupabasePublicClient();

  const { data, error } = await supabase
    .from("templates")
    .select("id, title, content, is_public, user_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ template: data }, { status: 200 });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !isUuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; content?: unknown; is_public?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.content === "string") patch.content = body.content.trim();
  if (typeof body.is_public === "boolean") patch.is_public = body.is_public;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const supabase = createSupabaseRlsClient(token);
  const { data, error } = await supabase
    .from("templates")
    .update(patch)
    .eq("id", id)
    .select("id, title, is_public, user_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ template: data }, { status: 200 });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !isUuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRlsClient(token);
  const { error } = await supabase.from("templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
