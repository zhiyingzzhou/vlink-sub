import type { ProxyType } from "@/lib/proxy/types";

export type BadgeTone = "primary" | "secondary" | "accent" | "muted" | "danger" | "neutral";

export type ProxyTypeMeta = {
  label: string;
  glyph: string;
  tone: BadgeTone;
};

export const PROXY_TYPE_META: Record<ProxyType, ProxyTypeMeta> = {
  vless: { label: "VLESS", glyph: "V", tone: "primary" },
  vmess: { label: "VMess", glyph: "M", tone: "secondary" },
  trojan: { label: "Trojan", glyph: "T", tone: "neutral" },
  ss: { label: "SS", glyph: "S", tone: "accent" },
  wireguard: { label: "WireGuard", glyph: "W", tone: "muted" },
};

