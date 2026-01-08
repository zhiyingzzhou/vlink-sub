function normalizeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

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

