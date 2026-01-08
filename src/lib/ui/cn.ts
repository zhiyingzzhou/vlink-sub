export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean>
  | ClassValue[];

function toClassName(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toClassName).filter(Boolean).join(" ");
  return Object.entries(value)
    .filter(([, ok]) => Boolean(ok))
    .map(([k]) => k)
    .join(" ");
}

export function cn(...values: ClassValue[]): string {
  return values.map(toClassName).filter(Boolean).join(" ");
}

