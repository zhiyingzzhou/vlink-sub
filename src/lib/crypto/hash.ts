import "server-only";

import crypto from "node:crypto";

/** 计算 SHA-256 十六进制摘要（用于 secret_hash、config_hash 等）。 */
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
