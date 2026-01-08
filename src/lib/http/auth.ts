import "server-only";

/**
 * HTTP 认证相关的小工具。
 *
 * 说明：
 * - 这里的 JWT 解析只做结构性解析（不验证签名），用于从 access token 里取出 user id（sub）。
 * - 真正的鉴权依赖 Supabase / RLS；token 无效会在请求 Supabase 时被拒绝。
 */
function normalizeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
}

/** 从请求头中提取 `Bearer <token>`；不存在/格式不对返回 null。 */
export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * 从 JWT payload 中提取 `sub` 并做 UUID 格式校验。
 *
 * 注意：不验证签名，返回值仅用于便捷填充 `user_id` 字段；安全边界由 Supabase 侧校验保证。
 */
export function getUserIdFromJwt(accessToken: string): string | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = Buffer.from(normalizeBase64Url(parts[1]), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson) as { sub?: unknown };
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub)) {
      return null;
    }
    return sub;
  } catch {
    return null;
  }
}
