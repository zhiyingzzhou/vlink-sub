import "server-only";

import crypto from "node:crypto";

/**
 * Crockford Base32 token 工具。
 *
 * 用途：
 * - `short_code/secret` 的生成与归一化（便于抄写/口述，避免 O/0、I/L/1 混淆）。
 * - 基础格式校验（长度 + 字符集）。
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 生成指定长度的 Crockford Base32 随机串（服务端使用）。 */
export function randomCrockfordBase32(length: number): string {
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error("length 必须为正整数");
  }

  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

/** 归一化：去空格、转大写，并将易混淆字符替换成标准形式。 */
export function normalizeCrockfordBase32(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** 校验是否为合法 Crockford Base32（归一化后再验证）。 */
export function isCrockfordBase32(
  input: string,
  minLen: number,
  maxLen: number
): boolean {
  const v = normalizeCrockfordBase32(input);
  if (v.length < minLen || v.length > maxLen) return false;
  return /^[0-9A-HJKMNPQRSTVWXYZ]+$/.test(v);
}
