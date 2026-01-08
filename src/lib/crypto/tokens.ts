import "server-only";

import crypto from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

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

export function normalizeCrockfordBase32(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function isCrockfordBase32(
  input: string,
  minLen: number,
  maxLen: number
): boolean {
  const v = normalizeCrockfordBase32(input);
  if (v.length < minLen || v.length > maxLen) return false;
  return /^[0-9A-HJKMNPQRSTVWXYZ]+$/.test(v);
}

