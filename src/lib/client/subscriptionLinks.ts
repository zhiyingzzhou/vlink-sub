const STORAGE_PREFIX = "vlink-sub:subscription-secret:";

/**
 * 控制台侧的订阅链接工具（浏览器端）。
 *
 * 设计：
 * - secret 只会在创建/重置时返回一次；前端建议把它保存在本机（localStorage）。
 * - token 采用 Crockford Base32 归一化，减少用户手动复制时的歧义字符问题。
 */
function normalizeToken(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

function storageKey(shortCode: string): string {
  return `${STORAGE_PREFIX}${normalizeToken(shortCode)}`;
}

/** 保存 secret 到 localStorage（失败则静默忽略）。 */
export function saveSubscriptionSecret(shortCode: string, secret: string): void {
  try {
    localStorage.setItem(storageKey(shortCode), normalizeToken(secret));
  } catch {
    // ignore
  }
}

/** 从 localStorage 读取 secret（不存在/读取失败返回 null）。 */
export function loadSubscriptionSecret(shortCode: string): string | null {
  try {
    const value = localStorage.getItem(storageKey(shortCode));
    return value ? normalizeToken(value) : null;
  } catch {
    return null;
  }
}

/** 组装 `/s/<shortCode>/<secret>` 的完整导出链接。 */
export function buildSubscriptionUrl(
  origin: string,
  shortCode: string,
  secret: string
): string {
  const sc = normalizeToken(shortCode);
  const sec = normalizeToken(secret);
  return `${origin.replace(/\/$/, "")}/s/${encodeURIComponent(sc)}/${encodeURIComponent(sec)}`;
}
