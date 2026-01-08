import "server-only";

import crypto from "node:crypto";

const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = "v2";
const KEY_BYTES = 32;

function normalizeBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
}

let cachedKeyring: { activeKeyId: string; keys: Map<string, Buffer> } | null =
  null;

function loadKeyring(): { activeKeyId: string; keys: Map<string, Buffer> } {
  if (cachedKeyring) return cachedKeyring;

  const activeKeyId = (process.env.DATA_ENCRYPTION_KEY_ID || "k1").trim();
  const activeKeyB64 = process.env.DATA_ENCRYPTION_KEY;
  if (!activeKeyB64) {
    throw new Error("缺少环境变量：DATA_ENCRYPTION_KEY（32字节 base64）");
  }

  const keys = new Map<string, Buffer>();

  const keyring = (process.env.DATA_ENCRYPTION_KEYRING || "").trim();
  if (keyring) {
    for (const part of keyring.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [id, b64] = part.split("=", 2);
      if (!id || !b64) continue;
      const key = Buffer.from(normalizeBase64(b64), "base64");
      if (key.length !== KEY_BYTES) continue;
      keys.set(id.trim(), key);
    }
  }

  const activeKey = Buffer.from(normalizeBase64(activeKeyB64), "base64");
  if (activeKey.length !== KEY_BYTES) {
    throw new Error("DATA_ENCRYPTION_KEY 必须是 32 字节的 base64 编码");
  }
  keys.set(activeKeyId, activeKey);

  cachedKeyring = { activeKeyId, keys };
  return cachedKeyring;
}

export function getActiveEncryptionKeyId(): string {
  return (process.env.DATA_ENCRYPTION_KEY_ID || "k1").trim();
}

export function encryptRawData(plaintext: string): string {
  const { activeKeyId, keys } = loadKeyring();
  const key = keys.get(activeKeyId);
  if (!key) {
    throw new Error(`找不到加密密钥：${activeKeyId}`);
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, tag, ciphertext]);
  return `${VERSION}:${activeKeyId}:${packed.toString("base64")}`;
}

export function decryptRawData(encrypted: string): string {
  const value = encrypted.trim();
  if (!value.startsWith(`${VERSION}:`)) return "";

  const rest = value.slice(`${VERSION}:`.length);
  const [keyId, base64] = rest.split(":", 2);
  if (!keyId || !base64) return "";

  const { keys } = loadKeyring();
  const key = keys.get(keyId);
  if (!key) return "";

  let packed: Buffer;
  try {
    packed = Buffer.from(normalizeBase64(base64), "base64");
  } catch {
    return "";
  }
  const minLen = IV_BYTES + TAG_BYTES + 1;
  if (packed.length < minLen) return "";

  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES + TAG_BYTES);

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    return "";
  }
}
