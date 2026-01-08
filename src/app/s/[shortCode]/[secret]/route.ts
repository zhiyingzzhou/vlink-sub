import { handleSubscriptionExport } from "@/lib/routes/subscriptionExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 订阅导出主路由：`/s/<shortCode>/<secret>`
 *
 * 真正逻辑在 `handleSubscriptionExport`（包含校验、限流、ETag/304、过期/停用处理）。
 */
type RouteContext = {
  params: { shortCode: string; secret: string } | Promise<{ shortCode: string; secret: string }>;
};

export async function GET(req: Request, ctx: RouteContext) {
  const { shortCode, secret } = await ctx.params;
  return handleSubscriptionExport(req, shortCode, secret);
}
