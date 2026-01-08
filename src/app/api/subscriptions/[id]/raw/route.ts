import { NextResponse } from "next/server";

import { decryptRawData } from "@/lib/crypto/rawData";
import { getBearerToken } from "@/lib/http/auth";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 解密返回订阅原文（控制台“查看原文/再次编辑”用）。
 *
 * 安全：
 * - 仅允许携带 Bearer token 的控制台请求访问。
 * - 原文属于敏感信息，强制 `Cache-Control: no-store`。
 */
type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseRlsClient(token);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, raw_data")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = decryptRawData(String((data as { raw_data?: unknown }).raw_data || ""));
  if (!raw) {
    return NextResponse.json({ error: "decrypt failed" }, { status: 500 });
  }

  return NextResponse.json(
    { raw },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
