const STORAGE_PREFIX = "vlink-sub:subscription-secret:";

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

export function saveSubscriptionSecret(shortCode: string, secret: string): void {
  try {
    localStorage.setItem(storageKey(shortCode), normalizeToken(secret));
  } catch {
    // ignore
  }
}

export function loadSubscriptionSecret(shortCode: string): string | null {
  try {
    const value = localStorage.getItem(storageKey(shortCode));
    return value ? normalizeToken(value) : null;
  } catch {
    return null;
  }
}

export function buildSubscriptionUrl(
  origin: string,
  shortCode: string,
  secret: string
): string {
  const sc = normalizeToken(shortCode);
  const sec = normalizeToken(secret);
  return `${origin.replace(/\/$/, "")}/s/${encodeURIComponent(sc)}/${encodeURIComponent(sec)}`;
}

