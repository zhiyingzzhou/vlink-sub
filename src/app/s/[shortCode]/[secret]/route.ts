import { handleSubscriptionExport } from "@/lib/routes/subscriptionExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { shortCode: string; secret: string } | Promise<{ shortCode: string; secret: string }>;
};

export async function GET(req: Request, ctx: RouteContext) {
  const { shortCode, secret } = await ctx.params;
  return handleSubscriptionExport(req, shortCode, secret);
}

