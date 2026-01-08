import { handleSubscriptionExport } from "@/lib/routes/subscriptionExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { shortCode: string } | Promise<{ shortCode: string }>;
};

export async function GET(req: Request, ctx: RouteContext) {
  const { shortCode } = await ctx.params;
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    url.searchParams.get("token") ||
    url.searchParams.get("s");

  return handleSubscriptionExport(req, shortCode, secret);
}
