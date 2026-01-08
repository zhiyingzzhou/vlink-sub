import { NextResponse } from "next/server";

import { sha256Hex } from "@/lib/crypto/hash";
import { randomCrockfordBase32 } from "@/lib/crypto/tokens";
import { getBearerToken } from "@/lib/http/auth";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

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

