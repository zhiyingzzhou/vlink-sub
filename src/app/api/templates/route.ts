import { NextResponse } from "next/server";

import { getBearerToken, getUserIdFromJwt } from "@/lib/http/auth";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 模板列表/创建 API。
 *
 * - `GET /api/templates`：未登录也可读（公共模板）；登录后还能看到“我的模板”。
 * - `POST /api/templates`：创建模板（需要 Bearer token，依赖 RLS 限制写入权限）。
 */
export async function GET(req: Request) {
  const token = getBearerToken(req);
  const supabase = token
    ? createSupabaseRlsClient(token)
    : createSupabasePublicClient();

  const { data, error } = await supabase
    .from("templates")
    .select("id, title, is_public, user_id, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] }, { status: 200 });
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
    | { title?: unknown; content?: unknown; is_public?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const isPublic = typeof body.is_public === "boolean" ? body.is_public : false;

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const supabase = createSupabaseRlsClient(token);
  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      title,
      content,
      is_public: isPublic,
    })
    .select("id, title, is_public, user_id, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}
