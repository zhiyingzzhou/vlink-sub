import type { ProxyNode } from "@/lib/proxy/types";

export type ClashProxy = Record<string, unknown> & { name: string };

/**
 * 将内部 `ProxyNode` 转换为 Clash Meta（Mihomo）可识别的 proxy 对象。
 *
 * 约定：只写入通用字段 + 协议特有字段，保持输出尽量“干净”，其余由模板/默认配置补齐。
 */
export function toClashProxy(node: ProxyNode): ClashProxy {
  if (node.type === "vless") {
    const proxy: ClashProxy = {
      name: node.name,
      type: "vless",
      server: node.server,
      port: node.port,
      uuid: node.config.uuid,
      udp: true,
    };

    if (node.config.network) proxy.network = node.config.network;
    if (typeof node.config.tls === "boolean") proxy.tls = node.config.tls;
    if (node.config.flow) proxy.flow = node.config.flow;

    if (node.config.sni) proxy.servername = node.config.sni;
    if (node.config.fingerprint) proxy["client-fingerprint"] = node.config.fingerprint;

    const realityPublicKey = node.config.reality?.publicKey;
    const realityShortId = node.config.reality?.shortId;
    if (realityPublicKey || realityShortId) {
      proxy["reality-opts"] = {
        ...(realityPublicKey ? { "public-key": realityPublicKey } : null),
        ...(realityShortId ? { "short-id": realityShortId } : null),
      };
    }

    if (node.config.ws?.path || node.config.ws?.host) {
      proxy["ws-opts"] = {
        ...(node.config.ws?.path ? { path: node.config.ws.path } : null),
        ...(node.config.ws?.host ? { headers: { Host: node.config.ws.host } } : null),
      };
    }

    if (node.config.grpc?.serviceName || node.config.grpc?.mode) {
      proxy["grpc-opts"] = {
        ...(node.config.grpc?.serviceName
          ? { "grpc-service-name": node.config.grpc.serviceName }
          : null),
      };
      if (node.config.grpc?.mode) proxy["grpc-mode"] = node.config.grpc.mode;
    }

    return proxy;
  }

  if (node.type === "vmess") {
    const proxy: ClashProxy = {
      name: node.name,
      type: "vmess",
      server: node.server,
      port: node.port,
      uuid: node.config.uuid,
      udp: true,
    };

    if (typeof node.config.alterId === "number") proxy.alterId = node.config.alterId;
    if (node.config.cipher) proxy.cipher = node.config.cipher;
    if (typeof node.config.tls === "boolean") proxy.tls = node.config.tls;
    if (node.config.network) proxy.network = node.config.network;
    if (node.config.sni) proxy.servername = node.config.sni;

    if (node.config.network === "ws" && (node.config.path || node.config.host)) {
      proxy["ws-opts"] = {
        ...(node.config.path ? { path: node.config.path } : null),
        ...(node.config.host ? { headers: { Host: node.config.host } } : null),
      };
    }

    return proxy;
  }

  if (node.type === "trojan") {
    const proxy: ClashProxy = {
      name: node.name,
      type: "trojan",
      server: node.server,
      port: node.port,
      password: node.config.password,
      udp: true,
    };

    if (typeof node.config.tls === "boolean") proxy.tls = node.config.tls;
    if (node.config.sni) proxy.sni = node.config.sni;
    if (node.config.alpn) {
      proxy.alpn = node.config.alpn
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (node.config.fingerprint) proxy["client-fingerprint"] = node.config.fingerprint;

    return proxy;
  }

  if (node.type === "ss") {
    const proxy: ClashProxy = {
      name: node.name,
      type: "ss",
      server: node.server,
      port: node.port,
      cipher: node.config.cipher,
      password: node.config.password,
      udp: true,
    };

    if (node.config.plugin) proxy.plugin = node.config.plugin;
    if (node.config.pluginOpts) proxy["plugin-opts"] = node.config.pluginOpts;

    return proxy;
  }

  const proxy: ClashProxy = {
    name: node.name,
    type: "wireguard",
    server: node.server,
    port: node.port,
    udp: true,
  };

  if (node.config.privateKey) proxy["private-key"] = node.config.privateKey;
  if (node.config.peerPublicKey) proxy["public-key"] = node.config.peerPublicKey;
  if (node.config.endpoint) proxy.endpoint = node.config.endpoint;

  if (node.config.address) proxy.ip = node.config.address;

  if (node.config.dns) {
    const parts = node.config.dns
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    proxy.dns = parts.length > 1 ? parts : parts[0];
  }

  if (typeof node.config.mtu === "number") proxy.mtu = node.config.mtu;
  if (typeof node.config.persistentKeepalive === "number") {
    proxy["persistent-keepalive"] = node.config.persistentKeepalive;
  }

  return proxy;
}
