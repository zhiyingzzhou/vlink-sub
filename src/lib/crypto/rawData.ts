import "server-only";

import crypto from "node:crypto";

/**
 * 订阅原文加/解密（AES-256-GCM）。
 *
 * 存储格式（版本化，便于密钥轮换/升级）：
 * `v2:<keyId>:<base64(iv + tag + ciphertext)>`
 *
 * 约定：
 * - 加密失败直接抛错（通常是环境变量缺失/密钥非法）。
 * - 解密失败返回空字符串（调用方可将其视为“数据损坏/密钥不匹配”）。
 */
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = "v2";
const KEY_BYTES = 32;

/** URL-safe base64 归一化到 Node.js 可解码的 base64（补齐 padding）。 */
function normalizeBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
}

let cachedKeyring: { activeKeyId: string; keys: Map<string, Buffer> } | null =
  null;

/**
 * 从环境变量加载密钥/Keyring，并做基础校验。
 *
 * - `DATA_ENCRYPTION_KEY`：当前生效的 32 字节 base64 key
 * - `DATA_ENCRYPTION_KEY_ID`：当前 key 的 id（默认 k1）
 * - `DATA_ENCRYPTION_KEYRING`：旧 key 列表（读取旧数据用），格式 `id=base64,id=base64`
 */
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

/** 返回当前写入数据所用的 key id（用于调试/展示）。 */
export function getActiveEncryptionKeyId(): string {
  return (process.env.DATA_ENCRYPTION_KEY_ID || "k1").trim();
}

/**
 * 加密订阅原文，返回可直接入库的字符串。
 *
 * @throws 当环境变量缺失或密钥非法时抛错
 */
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

/**
 * 解密入库的密文。
 *
 * @returns 解密失败时返回空字符串（避免在导出/API 路径中抛出并泄漏细节）
 */
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
