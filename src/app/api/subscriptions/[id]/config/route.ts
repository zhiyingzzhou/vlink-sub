import { NextResponse } from "next/server";

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
    .select("id, short_code, config_cache, config_hash")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const row = data as unknown as {
    short_code?: unknown;
    config_cache?: unknown;
    config_hash?: unknown;
  };

  const configText = String(row.config_cache || "");
  const configHash = String(row.config_hash || "");
  const shortCode = String(row.short_code || "subscription");

  if (!configText || !configHash) {
    return NextResponse.json({ error: "not ready" }, { status: 503 });
  }

  return new NextResponse(configText, {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "no-store",
      ETag: `"${configHash}"`,
      "Content-Disposition": `attachment; filename=\"vlink-sub-${shortCode}.yaml\"`,
    },
  });
}

