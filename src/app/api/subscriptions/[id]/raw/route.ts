import { NextResponse } from "next/server";

import { decryptRawData } from "@/lib/crypto/rawData";
import { getBearerToken } from "@/lib/http/auth";
import { createSupabaseRlsClient } from "@/lib/supabase/rls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function GET(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

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

