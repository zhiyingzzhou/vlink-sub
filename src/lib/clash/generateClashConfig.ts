import yaml from "js-yaml";

import { toClashProxy } from "@/lib/clash/toClashProxy";
import type { ProxyNode } from "@/lib/proxy/types";

type ClashConfig = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeNames(nodes: ProxyNode[]): ProxyNode[] {
  const seen = new Map<string, number>();
  return nodes.map((node) => {
    const baseName = (node.name || "").trim() || `${node.type}-${node.server}:${node.port}`;
    const count = seen.get(baseName) ?? 0;
    seen.set(baseName, count + 1);
    if (count === 0) return { ...node, name: baseName };
    return { ...node, name: `${baseName} (${count + 1})` };
  });
}

function ensureProxyGroups(
  existing: unknown,
  proxyNames: string[]
): Record<string, unknown>[] {
  const groups: Record<string, unknown>[] = Array.isArray(existing)
    ? existing.filter(isPlainObject)
    : [];

  const urlTestGroup = {
    name: "⚡ 自动测速",
    type: "url-test",
    url: "http://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 50,
    proxies: proxyNames,
  };

  const selectGroup = {
    name: "🚀 节点选择",
    type: "select",
    proxies: ["⚡ 自动测速", ...proxyNames, "DIRECT"],
  };

  const required = [selectGroup, urlTestGroup];

  const byName = new Map<string, Record<string, unknown>>();
  for (const g of groups) {
    const n = typeof g["name"] === "string" ? (g["name"] as string) : "";
    if (n) byName.set(n, g);
  }

  const merged: Record<string, unknown>[] = [];
  for (const g of required) {
    merged.push(g);
    byName.delete(g.name);
  }

  for (const g of groups) {
    const n = typeof g["name"] === "string" ? (g["name"] as string) : "";
    if (!n || !byName.has(n)) continue;
    merged.push(g);
    byName.delete(n);
  }

  return merged;
}

function defaultRuleProviders(): Record<string, unknown> {
  const base = (name: string, behavior: "domain" | "ipcidr" | "classical", url: string) => ({
    type: "http",
    behavior,
    url,
    path: `./ruleset/${name}.yaml`,
    interval: 86400,
  });

  return {
    reject: base("reject", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/reject.txt"),
    icloud: base("icloud", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/icloud.txt"),
    apple: base("apple", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/apple.txt"),
    google: base("google", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/google.txt"),
    proxy: base("proxy", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt"),
    direct: base("direct", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt"),
    private: base("private", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt"),
    gfw: base("gfw", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/gfw.txt"),
    "tld-not-cn": base("tld-not-cn", "domain", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/tld-not-cn.txt"),
    telegramcidr: base(
      "telegramcidr",
      "ipcidr",
      "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/telegramcidr.txt"
    ),
    cncidr: base("cncidr", "ipcidr", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt"),
    lancidr: base("lancidr", "ipcidr", "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/lancidr.txt"),
    applications: base(
      "applications",
      "classical",
      "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/applications.txt"
    ),
  };
}

function defaultRules(): string[] {
  return [
    "RULE-SET,applications,DIRECT",
    "RULE-SET,private,DIRECT",
    "RULE-SET,reject,REJECT",
    "RULE-SET,icloud,DIRECT",
    "RULE-SET,apple,DIRECT",
    "RULE-SET,google,DIRECT",
    "RULE-SET,proxy,🚀 节点选择",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,lancidr,DIRECT,no-resolve",
    "RULE-SET,cncidr,DIRECT,no-resolve",
    "RULE-SET,telegramcidr,🚀 节点选择,no-resolve",
    "MATCH,🚀 节点选择",
  ];
}

function defaultDns(): Record<string, unknown> {
  return {
    enable: true,
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
    "fake-ip-filter": ["*.lan", "localhost.ptlogin2.qq.com"],
  };
}

function mergeDns(existing: unknown): Record<string, unknown> {
  const base = defaultDns();
  if (!isPlainObject(existing)) return base;

  const merged: Record<string, unknown> = { ...base, ...existing };

  if (!("enhanced-mode" in merged) || !merged["enhanced-mode"]) {
    merged["enhanced-mode"] = "fake-ip";
  }

  return merged;
}

function parseTemplate(templateContent: string | null | undefined): ClashConfig {
  if (!templateContent) return {};
  try {
    const doc = yaml.load(templateContent);
    return isPlainObject(doc) ? doc : {};
  } catch {
    return {};
  }
}

function injectComments(dumped: string): string {
  let out = dumped;
  out = out.replace(
    /^dns:\s*$/m,
    "# ===== #6a00ff DNS Fake-IP =====\ndns:"
  );
  out = out.replace(
    /^rule-providers:\s*$/m,
    "# ===== #6a00ff Rule Providers (Loyalsoldier) =====\nrule-providers:"
  );
  return `# vlink-sub / Mihomo\n# theme: #6a00ff\n${out}`;
}

export function generateClashConfig(nodes: ProxyNode[], templateContent?: string | null): string {
  const uniqNodes = dedupeNames(nodes);
  const proxies = uniqNodes.map(toClashProxy);
  const proxyNames = proxies.map((p) => p.name);

  const config: ClashConfig = parseTemplate(templateContent);

  if (!("mode" in config)) config.mode = "rule";
  if (!("log-level" in config)) config["log-level"] = "info";
  if (!("mixed-port" in config) && !("port" in config)) config["mixed-port"] = 7890;

  config.proxies = proxies;
  config["proxy-groups"] = ensureProxyGroups(config["proxy-groups"], proxyNames);

  if (!isPlainObject(config["rule-providers"])) {
    config["rule-providers"] = defaultRuleProviders();
  }
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    config.rules = defaultRules();
  }

  config.dns = mergeDns(config.dns);

  const dumped = yaml.dump(config, { lineWidth: -1, noRefs: true });
  return injectComments(dumped);
}
