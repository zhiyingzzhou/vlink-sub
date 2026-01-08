import { NextResponse } from "next/server";

import { sha256Hex } from "@/lib/crypto/hash";
import { randomCrockfordBase32 } from "@/lib/crypto/tokens";
import { getBearerToken } from "@/lib/http/auth";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 重置订阅 secret（使旧导出链接失效）。
 *
 * 说明：
 * - 数据库只存 `secret_hash`；真正的 secret 只会在本接口返回一次。
 * - 前端应将 secret 保存在本机（localStorage），避免丢失后只能再次重置。
 */
type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 生成导出链接所需的 origin（兼容反向代理的 x-forwarded-*）。 */
function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseRlsClient(token);
  const secret = randomCrockfordBase32(26);
  const secretHash = sha256Hex(secret);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ secret_hash: secretHash })
    .eq("id", id)
    .select("id, short_code")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = `${getOrigin(req)}/s/${data.short_code}/${secret}`;
  return NextResponse.json(
    { id: data.id, short_code: data.short_code, secret, url },
    { status: 200 }
  );
}
