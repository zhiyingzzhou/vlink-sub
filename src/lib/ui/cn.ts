export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean>
  | ClassValue[];

/**
 * 轻量 className 拼接工具（类似 clsx）。
 *
 * 支持：
 * - string/number
 * - 数组嵌套
 * - `{ "class-a": condition }` 形式的条件 class
 */
function toClassName(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toClassName).filter(Boolean).join(" ");
  return Object.entries(value)
    .filter(([, ok]) => Boolean(ok))
    .map(([k]) => k)
    .join(" ");
}

/** 拼接多个 className（过滤空值）。 */
export function cn(...values: ClassValue[]): string {
  return values.map(toClassName).filter(Boolean).join(" ");
}
