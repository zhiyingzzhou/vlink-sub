import yaml from "js-yaml";

import { toClashProxy } from "@/lib/clash/toClashProxy";
import type { ProxyNode } from "@/lib/proxy/types";

type ClashConfig = Record<string, unknown>;

/**
 * 生成 Clash Meta（Mihomo）配置（YAML 文本）。
 *
 * 规则：
 * - 输入为解析后的节点数组；会先做 name 去重（Clash 要求 proxy name 唯一）。
 * - 可选传入模板 YAML：与默认值合并；缺失字段会注入一套安全的默认规则/规则集/DNS。
 * - 输出为可直接导入的完整 YAML，并在关键段落插入注释（便于人读/排错）。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Clash 要求 proxy name 唯一；发现重名时自动追加序号。 */
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

/**
 * 注入必备的 proxy-groups。
 *
 * - `🚀 节点选择`：手动选择入口
 * - `⚡ 自动测速`：url-test 自动测速
 *
 * 模板中同名组会被“要求项”覆盖，其他组保留。
 */
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

/**
 * 默认 rule-providers（Loyalsoldier 规则集）。
 *
 * 模板若未提供 `rule-providers`，则注入这一套。
 */
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

/** 默认 rules（配合上面的 rule-providers 与 proxy-groups）。 */
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

/** 默认 DNS（Fake-IP）。 */
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

/** 合并 DNS：模板里可覆盖默认，但会补齐关键字段。 */
function mergeDns(existing: unknown): Record<string, unknown> {
  const base = defaultDns();
  if (!isPlainObject(existing)) return base;

  const merged: Record<string, unknown> = { ...base, ...existing };

  if (!("enhanced-mode" in merged) || !merged["enhanced-mode"]) {
    merged["enhanced-mode"] = "fake-ip";
  }

  return merged;
}

/** 解析模板 YAML；解析失败返回空对象（避免模板错误导致整条链路崩）。 */
function parseTemplate(templateContent: string | null | undefined): ClashConfig {
  if (!templateContent) return {};
  try {
    const doc = yaml.load(templateContent);
    return isPlainObject(doc) ? doc : {};
  } catch {
    return {};
  }
}

/** 在导出的 YAML 中插入一些“可读性”注释（不影响 Clash 解析）。 */
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

/**
 * 生成 Clash YAML 文本（用于订阅导出与控制台预览）。
 *
 * @param nodes 解析后的节点数组
 * @param templateContent 可选：模板 YAML（快照或实时模板内容）
 */
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
