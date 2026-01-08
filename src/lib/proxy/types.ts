/**
 * 解析后的节点统一类型定义。
 *
 * 说明：
 * - `UniversalParser` 负责把文本解析成这些结构。
 * - `toClashProxy/generateClashConfig` 负责把这些结构转换为 Mihomo/Clash 配置。
 */
export type ProxyType = "vless" | "vmess" | "trojan" | "ss" | "wireguard";

export type ProxyNode =
  | {
      type: "vless";
      name: string;
      server: string;
      port: number;
      config: {
        uuid: string;
        flow?: string;
        encryption?: string;
        network?: string;
        security?: string;
        tls?: boolean;
        sni?: string;
        fingerprint?: string;
        reality?: {
          publicKey?: string;
          shortId?: string;
        };
        ws?: {
          path?: string;
          host?: string;
        };
        grpc?: {
          serviceName?: string;
          mode?: string;
        };
      };
    }
  | {
      type: "vmess";
      name: string;
      server: string;
      port: number;
      config: {
        uuid: string;
        alterId?: number;
        cipher?: string;
        network?: string;
        tls?: boolean;
        sni?: string;
        host?: string;
        path?: string;
      };
    }
  | {
      type: "trojan";
      name: string;
      server: string;
      port: number;
      config: {
        password: string;
        tls?: boolean;
        sni?: string;
        alpn?: string;
        fingerprint?: string;
      };
    }
  | {
      type: "ss";
      name: string;
      server: string;
      port: number;
      config: {
        cipher: string;
        password: string;
        plugin?: string;
        pluginOpts?: Record<string, string>;
      };
    }
  | {
      type: "wireguard";
      name: string;
      server: string;
      port: number;
      config: {
        privateKey?: string;
        peerPublicKey?: string;
        endpoint?: string;
        address?: string;
        dns?: string;
        mtu?: number;
        persistentKeepalive?: number;
      };
    };
