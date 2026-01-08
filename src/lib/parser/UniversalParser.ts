import type { ProxyNode } from "@/lib/proxy/types";

type Protocol = "vmess" | "vless" | "trojan" | "ss" | "wireguard";

/**
 * 通用订阅/节点文本解析器。
 *
 * 输入：用户从面板 / 客户端 / 频道复制出来的一段“混杂文本”。
 * 输出：可用于生成 Clash/Mihomo 配置的结构化节点数组，并提供逐条错误报告（不崩全局）。
 *
 * 支持协议：vmess / vless / trojan / ss / wireguard
 */
export type ParseError = {
  protocol: Protocol;
  link: string;
  index: number;
  line: number;
  message: string;
};

export type ParseReport = {
  nodes: ProxyNode[];
  errors: ParseError[];
  stats: {
    totalLinks: number;
    totalNodes: number;
    byType: Record<ProxyNode["type"], number>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** decodeURIComponent 的安全版本：解码失败则返回原字符串。 */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** URL-safe base64 归一化（补齐 padding，替换 -/_）。 */
function normalizeBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
}

/**
 * Base64 解码为 UTF-8 字符串。
 *
 * - Node.js 环境使用 `Buffer`
 * - 浏览器环境回退到 `atob`/`TextDecoder`
 */
function safeBase64ToString(input: string): string | null {
  const normalized = normalizeBase64(input);
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(normalized, "base64").toString("utf8");
    }
  } catch {
  }
  try {
    if (typeof atob === "function") {
      const binary = atob(normalized);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(bytes);
      }
      return String.fromCharCode(...Array.from(bytes));
    }
  } catch {
    // ignore
  }
  return null;
}

type LinkMatch = { link: string; protocol: Protocol; index: number; line: number };

/** 将字符 index 转换为“行号”（从 1 开始），用于更友好的报错展示。 */
function getLineFromIndex(raw: string, index: number): number {
  let line = 1;
  for (let i = 0; i < raw.length && i < index; i += 1) {
    if (raw.charCodeAt(i) === 10) line += 1; // \n
  }
  return line;
}

/** 从混杂文本中提取形如 `proto://...` 的链接，并记录其出现位置。 */
function extractLinks(raw: string): LinkMatch[] {
  const out: LinkMatch[] = [];
  const re = /\b(vmess|vless|trojan|ss|wireguard):\/\/[^\s<>"']+/gi;
  for (const match of raw.matchAll(re)) {
    const link = match[0];
    const protocol = getProtocol(link);
    if (!protocol) continue;
    const index = typeof match.index === "number" ? match.index : 0;
    out.push({ link, protocol, index, line: getLineFromIndex(raw, index) });
  }
  return out;
}

function getNameFromHash(hash: string | null | undefined): string | undefined {
  if (!hash) return undefined;
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return safeDecodeURIComponent(trimmed);
}

/** 解析端口号：非法/缺失返回 null。 */
function parsePort(value: string | null | undefined): number | null {
  if (!value) return null;
  const port = Number(value);
  if (!Number.isFinite(port) || port <= 0) return null;
  return port;
}

type ParseResult = { node: ProxyNode } | { error: string };

function ok(node: ProxyNode): ParseResult {
  return { node };
}

function err(message: string): ParseResult {
  return { error: message };
}

function parseVmess(link: string): ParseResult {
  const payload = link.slice("vmess://".length).trim();
  const json = safeBase64ToString(payload);
  if (!json) return err("vmess Base64 解码失败");

  let dataUnknown: unknown;
  try {
    dataUnknown = JSON.parse(json);
  } catch {
    return err("vmess JSON 解析失败");
  }
  if (!isRecord(dataUnknown)) return err("vmess JSON 非对象");
  const data = dataUnknown;

  const server = String(data["add"] ?? "").trim();
  const port = parsePort(String(data["port"] ?? ""));
  const uuid = String(data["id"] ?? "").trim();
  if (!server || !port || !uuid) return err("vmess 缺少 add/port/id");

  const name = String(data["ps"] ?? "").trim() || `vmess-${server}:${port}`;

  const tlsValue = String(data["tls"] ?? "").trim().toLowerCase();
  const tls = tlsValue === "tls" || tlsValue === "1" || tlsValue === "true";

  const alterIdNum = Number(data["aid"] ?? data["alterId"] ?? 0);
  const alterId = Number.isFinite(alterIdNum) ? alterIdNum : undefined;

  return ok({
    type: "vmess",
    name,
    server,
    port,
    config: {
      uuid,
      alterId,
      cipher: String(data["scy"] ?? data["cipher"] ?? "").trim() || undefined,
      network: String(data["net"] ?? "").trim() || undefined,
      tls,
      sni: String(data["sni"] ?? "").trim() || undefined,
      host: String(data["host"] ?? "").trim() || undefined,
      path: String(data["path"] ?? "").trim() || undefined,
    },
  });
}

function parseVless(link: string): ParseResult {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return err("vless URL 解析失败");
  }

  const uuid = url.username.trim();
  const server = url.hostname.trim();
  const port = parsePort(url.port);
  if (!uuid || !server || !port) return err("vless 缺少 uuid/server/port");

  const hashName = getNameFromHash(url.hash);
  const name = hashName || `vless-${server}:${port}`;

  const params = url.searchParams;
  const security = (params.get("security") || "").trim();
  const encryption = (params.get("encryption") || "").trim();
  const network = (params.get("type") || params.get("network") || "").trim();
  const flow = (params.get("flow") || "").trim();

  const sni = (params.get("sni") || params.get("servername") || "").trim();
  const fingerprint = (params.get("fp") || params.get("fingerprint") || "").trim();

  const pbk = (params.get("pbk") || params.get("publicKey") || "").trim();
  const sid = (params.get("sid") || params.get("shortId") || "").trim();

  const path = safeDecodeURIComponent(params.get("path") || "");
  const host = safeDecodeURIComponent(params.get("host") || "");

  const serviceName = safeDecodeURIComponent(
    params.get("serviceName") || params.get("service") || ""
  );
  const mode = (params.get("mode") || "").trim();

  const tls =
    security === "tls" || security === "reality" || security === "xtls";

  return ok({
    type: "vless",
    name,
    server,
    port,
    config: {
      uuid,
      flow: flow || undefined,
      encryption: encryption || undefined,
      network: network || undefined,
      security: security || undefined,
      tls,
      sni: sni || undefined,
      fingerprint: fingerprint || undefined,
      reality:
        pbk || sid
          ? {
              publicKey: pbk || undefined,
              shortId: sid || undefined,
            }
          : undefined,
      ws: path || host ? { path: path || undefined, host: host || undefined } : undefined,
      grpc:
        serviceName || mode
          ? { serviceName: serviceName || undefined, mode: mode || undefined }
          : undefined,
    },
  });
}

function parseTrojan(link: string): ParseResult {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return err("trojan URL 解析失败");
  }

  const server = url.hostname.trim();
  const port = parsePort(url.port);
  const password = safeDecodeURIComponent(url.username || "").trim();
  if (!server || !port || !password) return err("trojan 缺少 password/server/port");

  const name = getNameFromHash(url.hash) || `trojan-${server}:${port}`;
  const params = url.searchParams;

  const security = (params.get("security") || "").trim().toLowerCase();
  const tls = security === "tls" || security === "reality" || security === "xtls";

  const sni = (params.get("sni") || params.get("peer") || "").trim();
  const alpn = (params.get("alpn") || "").trim();
  const fingerprint = (params.get("fp") || params.get("fingerprint") || "").trim();

  return ok({
    type: "trojan",
    name,
    server,
    port,
    config: {
      password,
      tls,
      sni: sni || undefined,
      alpn: alpn || undefined,
      fingerprint: fingerprint || undefined,
    },
  });
}

function parsePlugin(pluginRaw: string): {
  plugin?: string;
  pluginOpts?: Record<string, string>;
} {
  const decoded = safeDecodeURIComponent(pluginRaw).trim();
  if (!decoded) return {};

  const [plugin, ...rest] = decoded.split(";");
  const pluginName = plugin.trim();
  if (!pluginName) return {};

  const pluginOpts: Record<string, string> = {};
  for (const part of rest) {
    const item = part.trim();
    if (!item) continue;
    const idx = item.indexOf("=");
    if (idx === -1) {
      pluginOpts[item] = "true";
      continue;
    }
    pluginOpts[item.slice(0, idx)] = item.slice(idx + 1);
  }

  return { plugin: pluginName, pluginOpts: Object.keys(pluginOpts).length ? pluginOpts : undefined };
}

function parseShadowsocks(link: string): ParseResult {
  const raw = link.slice("ss://".length);
  const [beforeHash, hash = ""] = raw.split("#", 2);
  const name = getNameFromHash(`#${hash}`) || "ss";

  const [beforeQuery, query = ""] = beforeHash.split("?", 2);
  const queryParams = new URLSearchParams(query);
  const pluginRaw = queryParams.get("plugin") || "";
  const { plugin, pluginOpts } = parsePlugin(pluginRaw);

  const main = beforeQuery.trim();
  if (!main) return err("ss 内容为空");

  const parseAuthHostPort = (value: string): {
    cipher: string;
    password: string;
    server: string;
    port: number;
  } | null => {
    const atIdx = value.lastIndexOf("@");
    if (atIdx === -1) return null;

    const userinfo = value.slice(0, atIdx);
    const hostport = value.slice(atIdx + 1);

    const [server, portStr] = hostport.split(":", 2);
    const port = parsePort(portStr);
    if (!server || !port) return null;

    const [cipher, password] = userinfo.split(":", 2);
    if (!cipher || !password) return null;

    return {
      cipher: safeDecodeURIComponent(cipher),
      password: safeDecodeURIComponent(password),
      server,
      port,
    };
  };

  // 1) 明文：method:password@host:port
  const direct = parseAuthHostPort(main);
  if (direct) {
    return ok({
      type: "ss",
      name: name === "ss" ? `ss-${direct.server}:${direct.port}` : name,
      server: direct.server,
      port: direct.port,
      config: {
        cipher: direct.cipher,
        password: direct.password,
        plugin,
        pluginOpts,
      },
    });
  }

  // 2) BASE64(method:password@host:port)
  const decodedAll = safeBase64ToString(main);
  if (decodedAll) {
    const decodedParsed = parseAuthHostPort(decodedAll.trim());
    if (decodedParsed) {
      return ok({
        type: "ss",
        name:
          name === "ss"
            ? `ss-${decodedParsed.server}:${decodedParsed.port}`
            : name,
        server: decodedParsed.server,
        port: decodedParsed.port,
        config: {
          cipher: decodedParsed.cipher,
          password: decodedParsed.password,
          plugin,
          pluginOpts,
        },
      });
    }
  }

  // 3) BASE64(method:password)@host:port
  const atIdx = main.lastIndexOf("@");
  if (atIdx !== -1) {
    const userinfoB64 = main.slice(0, atIdx);
    const hostport = main.slice(atIdx + 1);
    const userinfoDecoded = safeBase64ToString(userinfoB64);
    if (userinfoDecoded) {
      const combined = `${userinfoDecoded.trim()}@${hostport}`;
      const combinedParsed = parseAuthHostPort(combined);
      if (combinedParsed) {
        return ok({
          type: "ss",
          name:
            name === "ss"
              ? `ss-${combinedParsed.server}:${combinedParsed.port}`
              : name,
          server: combinedParsed.server,
          port: combinedParsed.port,
          config: {
            cipher: combinedParsed.cipher,
            password: combinedParsed.password,
            plugin,
            pluginOpts,
          },
        });
      }
    }
  }

  return err("ss 格式不支持或缺少字段");
}

function parseWireguard(link: string): ParseResult {
  // 尽量用 URL 解析；失败则回退到 endpoint= 的朴素解析
  let url: URL | null = null;
  try {
    url = new URL(link);
  } catch {
    url = null;
  }

  const name =
    (url ? getNameFromHash(url.hash) : undefined) ||
    "wireguard";

  const params = url ? url.searchParams : new URLSearchParams();

  const getParam = (...keys: string[]) => {
    for (const key of keys) {
      const v = params.get(key);
      if (v) return safeDecodeURIComponent(v).trim();
    }
    return "";
  };

  const endpointRaw = getParam("endpoint", "peer", "server");
  const privateKey = getParam("private-key", "privateKey", "private_key");
  const peerPublicKey = getParam(
    "peer-public-key",
    "peerPublicKey",
    "peer_public_key",
    "public-key",
    "publicKey"
  );
  const address = getParam("address", "ip", "addr");
  const dns = getParam("dns");

  const mtuNum = Number(getParam("mtu"));
  const mtu = Number.isFinite(mtuNum) && mtuNum > 0 ? mtuNum : undefined;

  const keepaliveNum = Number(getParam("persistentKeepalive", "keepalive"));
  const persistentKeepalive =
    Number.isFinite(keepaliveNum) && keepaliveNum >= 0
      ? keepaliveNum
      : undefined;

  let server = url?.hostname?.trim() || "";
  let port = parsePort(url?.port) || null;

  const tryApplyEndpoint = (endpoint: string) => {
    const value = endpoint.trim();
    if (!value) return;
    const match = value.match(/^(.+):(\d+)$/);
    if (!match) return;
    server = match[1].trim();
    port = parsePort(match[2]);
  };

  if ((!server || !port) && endpointRaw) tryApplyEndpoint(endpointRaw);
  if ((!server || !port) && !endpointRaw) {
    const fallbackMatch = link.match(/[?&]endpoint=([^&#]+)/);
    if (fallbackMatch) tryApplyEndpoint(safeDecodeURIComponent(fallbackMatch[1]));
  }

  if (!server || !port) return err("wireguard 缺少 endpoint/server/port");

  return ok({
    type: "wireguard",
    name: name === "wireguard" ? `wg-${server}:${port}` : name,
    server,
    port,
    config: {
      privateKey: privateKey || undefined,
      peerPublicKey: peerPublicKey || undefined,
      endpoint: endpointRaw || `${server}:${port}`,
      address: address || undefined,
      dns: dns || undefined,
      mtu,
      persistentKeepalive,
    },
  });
}

function getProtocol(link: string): Protocol | null {
  const lower = link.toLowerCase();
  if (lower.startsWith("vmess://")) return "vmess";
  if (lower.startsWith("vless://")) return "vless";
  if (lower.startsWith("trojan://")) return "trojan";
  if (lower.startsWith("ss://")) return "ss";
  if (lower.startsWith("wireguard://")) return "wireguard";
  return null;
}

export class UniversalParser {
  /**
   * 解析文本，并返回完整报告（节点 + 错误 + 统计）。
   *
   * 该方法不会抛错：单条链接解析失败会记录到 `errors`，其余继续解析。
   */
  parseWithReport(raw: string): ParseReport {
    const matches = extractLinks(raw);
    const nodes: ProxyNode[] = [];
    const errors: ParseError[] = [];

    for (const m of matches) {
      try {
        const result =
          m.protocol === "vmess"
            ? parseVmess(m.link)
            : m.protocol === "vless"
              ? parseVless(m.link)
              : m.protocol === "trojan"
                ? parseTrojan(m.link)
                : m.protocol === "ss"
                  ? parseShadowsocks(m.link)
                  : parseWireguard(m.link);

        if ("node" in result) {
          nodes.push(result.node);
        } else {
          errors.push({
            protocol: m.protocol,
            link: m.link,
            index: m.index,
            line: m.line,
            message: result.error,
          });
        }
      } catch {
        errors.push({
          protocol: m.protocol,
          link: m.link,
          index: m.index,
          line: m.line,
          message: "解析异常",
        });
      }
    }

    const byType: Record<ProxyNode["type"], number> = {
      vless: 0,
      vmess: 0,
      trojan: 0,
      ss: 0,
      wireguard: 0,
    };
    for (const node of nodes) byType[node.type] += 1;

    return {
      nodes,
      errors,
      stats: {
        totalLinks: matches.length,
        totalNodes: nodes.length,
        byType,
      },
    };
  }

  /** 只返回解析成功的节点列表（UI 快速预览用）。 */
  parse(raw: string): ProxyNode[] {
    return this.parseWithReport(raw).nodes;
  }
}
