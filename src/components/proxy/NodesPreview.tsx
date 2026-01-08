"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { ListItemButton } from "@/components/ui/ListItemButton";
import { TogglePill } from "@/components/ui/TogglePill";
import { useToast } from "@/components/ui/Toast";
import { toClashProxy } from "@/lib/clash/toClashProxy";
import { cn } from "@/lib/ui/cn";
import { PROXY_TYPE_META } from "@/lib/proxy/meta";
import type { ProxyNode, ProxyType } from "@/lib/proxy/types";

type NodesPreviewProps = {
  nodes: ProxyNode[];
  className?: string;
  maxItems?: number;
  emptyHint?: string;
};

function mask(value: string | undefined, opts?: { head?: number; tail?: number }): string {
  const head = opts?.head ?? 6;
  const tail = opts?.tail ?? 4;
  const v = (value || "").trim();
  if (!v) return "—";
  if (v.length <= head + tail + 3) return v;
  return `${v.slice(0, head)}…${v.slice(-tail)}`;
}

function joinParts(parts: Array<string | null | undefined>, sep = " · "): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(sep);
}

function typeIconClass(t: ProxyType): string {
  if (t === "vless") return "bg-primary/15 text-primary";
  if (t === "vmess") return "bg-secondary/15 text-secondary";
  if (t === "ss") return "bg-accent text-accent-foreground";
  if (t === "wireguard") return "bg-muted text-muted-foreground";
  return "bg-foreground/10 text-foreground";
}

function NodeTypeMark({ type }: { type: ProxyType }) {
  const meta = PROXY_TYPE_META[type];
  return (
    <div
      className={cn(
        "grid size-10 place-items-center shrink-0 rounded-2xl",
        "border border-border/60 shadow-[var(--shadow-soft)]",
        typeIconClass(type)
      )}
      aria-label={meta.label}
      title={meta.label}
    >
      <span className="font-heading text-sm font-extrabold">{meta.glyph}</span>
    </div>
  );
}

function nodeKey(node: ProxyNode): string {
  return `${node.type}:${node.server}:${node.port}:${node.name}`;
}

function nodeSubtitle(node: ProxyNode): string {
  const base = `${node.server}:${node.port}`;
  if (node.type === "vless") {
    const tags = [
      node.config.reality ? "reality" : null,
      node.config.tls ? "tls" : null,
      node.config.network || null,
    ];
    return joinParts([base, joinParts(tags, " / ")]);
  }
  if (node.type === "vmess") {
    const tags = [node.config.tls ? "tls" : null, node.config.network || null];
    return joinParts([base, joinParts(tags, " / ")]);
  }
  if (node.type === "trojan") {
    const tags = [node.config.tls ? "tls" : null, node.config.sni ? "sni" : null];
    return joinParts([base, joinParts(tags, " / ")]);
  }
  if (node.type === "ss") {
    return joinParts([base, node.config.cipher]);
  }
  if (node.type === "wireguard") {
    return joinParts([base, node.config.endpoint || null]);
  }
  return base;
}

function FieldRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string | number | null | undefined;
  monospace?: boolean;
}) {
  const v = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div
        className={cn(
          "min-w-0 text-sm text-foreground",
          monospace ? "font-mono text-[13px] break-all" : "break-words"
        )}
      >
        {v}
      </div>
    </div>
  );
}

function NodeDetails({ node }: { node: ProxyNode }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <FieldRow label="服务器" value={node.server} monospace />
        <FieldRow label="端口" value={node.port} monospace />

        {node.type === "vless" ? (
          <>
            <FieldRow label="UUID" value={mask(node.config.uuid)} monospace />
            {node.config.security || node.config.tls || node.config.reality ? (
              <FieldRow
                label="Security"
                value={
                  node.config.security ||
                  (node.config.reality ? "reality" : node.config.tls ? "tls" : null)
                }
              />
            ) : null}
            {node.config.network ? <FieldRow label="Network" value={node.config.network} /> : null}
            {node.config.flow ? <FieldRow label="Flow" value={node.config.flow} /> : null}
            {node.config.sni ? <FieldRow label="SNI" value={node.config.sni} monospace /> : null}
            {node.config.fingerprint ? (
              <FieldRow label="Fingerprint" value={node.config.fingerprint} />
            ) : null}
            {node.config.reality?.publicKey ? (
              <FieldRow
                label="Reality PBK"
                value={mask(node.config.reality.publicKey, { head: 10, tail: 6 })}
                monospace
              />
            ) : null}
            {node.config.reality?.shortId ? (
              <FieldRow
                label="Reality SID"
                value={mask(node.config.reality.shortId, { head: 6, tail: 6 })}
                monospace
              />
            ) : null}
            {node.config.ws?.path ? (
              <FieldRow label="WS Path" value={node.config.ws.path} monospace />
            ) : null}
            {node.config.ws?.host ? (
              <FieldRow label="WS Host" value={node.config.ws.host} monospace />
            ) : null}
            {node.config.grpc?.serviceName ? (
              <FieldRow label="gRPC Service" value={node.config.grpc.serviceName} monospace />
            ) : null}
            {node.config.grpc?.mode ? (
              <FieldRow label="gRPC Mode" value={node.config.grpc.mode} />
            ) : null}
          </>
        ) : null}

        {node.type === "vmess" ? (
          <>
            <FieldRow label="UUID" value={mask(node.config.uuid)} monospace />
            {node.config.cipher ? <FieldRow label="Cipher" value={node.config.cipher} /> : null}
            {typeof node.config.alterId === "number" ? (
              <FieldRow label="AlterId" value={node.config.alterId} monospace />
            ) : null}
            {node.config.network ? <FieldRow label="Network" value={node.config.network} /> : null}
            {node.config.tls ? <FieldRow label="TLS" value="true" /> : null}
            {node.config.sni ? <FieldRow label="SNI" value={node.config.sni} monospace /> : null}
            {node.config.host ? <FieldRow label="Host" value={node.config.host} monospace /> : null}
            {node.config.path ? <FieldRow label="Path" value={node.config.path} monospace /> : null}
          </>
        ) : null}

        {node.type === "trojan" ? (
          <>
            <FieldRow
              label="Password"
              value={mask(node.config.password, { head: 3, tail: 2 })}
              monospace
            />
            {node.config.tls ? <FieldRow label="TLS" value="true" /> : null}
            {node.config.sni ? <FieldRow label="SNI" value={node.config.sni} monospace /> : null}
            {node.config.alpn ? <FieldRow label="ALPN" value={node.config.alpn} /> : null}
            {node.config.fingerprint ? (
              <FieldRow label="Fingerprint" value={node.config.fingerprint} />
            ) : null}
          </>
        ) : null}

        {node.type === "ss" ? (
          <>
            <FieldRow label="Cipher" value={node.config.cipher} />
            <FieldRow
              label="Password"
              value={mask(node.config.password, { head: 3, tail: 2 })}
              monospace
            />
            {node.config.plugin ? <FieldRow label="Plugin" value={node.config.plugin} /> : null}
            {node.config.pluginOpts ? (
              <FieldRow
                label="Plugin Opts"
                value={Object.entries(node.config.pluginOpts)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; ")}
                monospace
              />
            ) : null}
          </>
        ) : null}

        {node.type === "wireguard" ? (
          <>
            {node.config.endpoint ? (
              <FieldRow label="Endpoint" value={node.config.endpoint} monospace />
            ) : null}
            {node.config.address ? (
              <FieldRow label="Address" value={node.config.address} monospace />
            ) : null}
            {node.config.dns ? <FieldRow label="DNS" value={node.config.dns} monospace /> : null}
            {typeof node.config.mtu === "number" ? (
              <FieldRow label="MTU" value={node.config.mtu} monospace />
            ) : null}
            {typeof node.config.persistentKeepalive === "number" ? (
              <FieldRow label="Keepalive" value={node.config.persistentKeepalive} monospace />
            ) : null}
            {node.config.peerPublicKey ? (
              <FieldRow
                label="Peer Public Key"
                value={mask(node.config.peerPublicKey, { head: 10, tail: 6 })}
                monospace
              />
            ) : null}
            {node.config.privateKey ? (
              <FieldRow
                label="Private Key"
                value={mask(node.config.privateKey, { head: 10, tail: 6 })}
                monospace
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function allTypesSelected(selected: Record<ProxyType, boolean>): boolean {
  return (Object.keys(selected) as ProxyType[]).every((t) => selected[t]);
}

type NodeEntry = {
  key: string;
  node: ProxyNode;
};

type JsYamlDump = (value: unknown, options?: Record<string, unknown>) => string;
type JsYamlApi = { dump: JsYamlDump };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getJsYamlApi(mod: unknown): JsYamlApi | null {
  if (isRecord(mod) && typeof mod["dump"] === "function") {
    return mod as unknown as JsYamlApi;
  }
  if (isRecord(mod) && isRecord(mod["default"]) && typeof mod["default"]["dump"] === "function") {
    return mod["default"] as unknown as JsYamlApi;
  }
  return null;
}

function copyCredential(node: ProxyNode): { label: string; value: string } | null {
  if (node.type === "vless" || node.type === "vmess") {
    return { label: "UUID", value: node.config.uuid };
  }
  if (node.type === "trojan") {
    return { label: "密码", value: node.config.password };
  }
  if (node.type === "ss") {
    return { label: "密码", value: node.config.password };
  }
  if (node.type === "wireguard") {
    const key = node.config.privateKey;
    if (!key) return null;
    return { label: "私钥", value: key };
  }
  return null;
}

export function NodesPreview({
  nodes,
  className,
  maxItems = 200,
  emptyHint = "粘贴节点后，这里会实时展示解析结果。",
}: NodesPreviewProps) {
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [selectedTypes, setSelectedTypes] = React.useState<Record<ProxyType, boolean>>({
    vless: true,
    vmess: true,
    trojan: true,
    ss: true,
    wireguard: true,
  });
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const normalized = q.trim().toLowerCase();

  const entries = React.useMemo<NodeEntry[]>(
    () => nodes.map((node, index) => ({ node, key: `${index}:${nodeKey(node)}` })),
    [nodes]
  );

  const filtered = React.useMemo(() => {
    const allowAll = allTypesSelected(selectedTypes) || Object.values(selectedTypes).every((v) => !v);
    const allow = (t: ProxyType) => allowAll || Boolean(selectedTypes[t]);

    const matchQ = (node: ProxyNode) => {
      if (!normalized) return true;
      const hay = `${node.name} ${node.server} ${node.port}`.toLowerCase();
      return hay.includes(normalized);
    };

    return entries.filter((e) => allow(e.node.type) && matchQ(e.node));
  }, [entries, normalized, selectedTypes]);

  const limited = React.useMemo(() => filtered.slice(0, maxItems), [filtered, maxItems]);

  React.useEffect(() => {
    if (limited.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey) return;
    if (limited.some((e) => e.key === selectedKey)) return;
    setSelectedKey(null);
  }, [limited, selectedKey]);

  const selected = React.useMemo(() => {
    if (!selectedKey) return null;
    const hit = limited.find((e) => e.key === selectedKey) || null;
    return hit?.node ?? null;
  }, [limited, selectedKey]);

  const copyText = React.useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success("已复制", label);
      } catch {
        toast.error("复制失败", "请手动选择并复制");
      }
    },
    [toast]
  );

  const copyProxyYaml = React.useCallback(
    async (node: ProxyNode) => {
      try {
        const proxy = toClashProxy(node);
        const mod = (await import("js-yaml")) as unknown;
        const yamlApi = getJsYamlApi(mod);
        if (!yamlApi) throw new Error("js-yaml load failed");
        const text = yamlApi.dump([proxy], { noRefs: true, lineWidth: -1 });
        await navigator.clipboard.writeText(text);
        toast.success("已复制", "单条代理 YAML");
      } catch {
        toast.error("复制失败", "请稍后重试");
      }
    },
    [toast]
  );

  const copyProxiesBlock = React.useCallback(
    async (node: ProxyNode) => {
      try {
        const proxy = toClashProxy(node);
        const mod = (await import("js-yaml")) as unknown;
        const yamlApi = getJsYamlApi(mod);
        if (!yamlApi) throw new Error("js-yaml load failed");
        const text = yamlApi.dump({ proxies: [proxy] }, { noRefs: true, lineWidth: -1 });
        await navigator.clipboard.writeText(text);
        toast.success("已复制", "proxies 块（含敏感字段）");
      } catch {
        toast.error("复制失败", "请稍后重试");
      }
    },
    [toast]
  );

  const toggleType = (t: ProxyType) => {
    setSelectedTypes((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const onPick = (key: string) => {
    setSelectedKey(key);
  };

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索节点名 / 服务器…"
        />

        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROXY_TYPE_META) as ProxyType[]).map((t) => {
            const meta = PROXY_TYPE_META[t];
            const enabled = selectedTypes[t];
            return (
              <TogglePill
                key={t}
                onClick={() => toggleType(t)}
                pressed={enabled}
                tone={meta.tone}
              >
                {meta.glyph} {meta.label}
              </TogglePill>
            );
          })}
        </div>
      </div>

      {limited.length === 0 ? (
        <div className="rounded-[2rem] border border-border/60 bg-background/60 p-5 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {nodes.length === 0 ? emptyHint : "没有匹配的节点（可尝试清空搜索或切换筛选）。"}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-[2rem] border border-border/60 bg-background/60 shadow-[var(--shadow-soft)]",
            "min-h-[340px] lg:min-h-[520px]",
            "flex flex-col min-w-0"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-4">
            <div className="font-heading text-sm font-extrabold tracking-tight">节点列表</div>
            <Badge tone="muted">{filtered.length} 条</Badge>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="grid gap-3">
              {limited.map((entry) => {
                const node = entry.node;
                const key = entry.key;
                const meta = PROXY_TYPE_META[node.type];
                const selected = key === selectedKey;
                return (
                  <ListItemButton
                    key={key}
                    selected={selected}
                    onClick={() => onPick(key)}
                    className="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <NodeTypeMark type={node.type} />
                      <div className="min-w-0">
                        <div className="truncate font-heading text-sm font-extrabold">
                          {node.name || "未命名节点"}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {nodeSubtitle(node)}
                        </div>
                      </div>
                      <Badge tone={meta.tone} className="shrink-0">
                        {meta.label}
                      </Badge>
                    </div>
                  </ListItemButton>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
            {filtered.length > maxItems
              ? `为避免卡顿，仅展示前 ${maxItems} 条；当前匹配 ${filtered.length} 条。`
              : `当前匹配 ${filtered.length} 条。`}
          </div>

          <Dialog
            open={Boolean(selected)}
            onOpenChange={(open) => {
              if (!open) setSelectedKey(null);
            }}
            size="lg"
            closeLabel="关闭"
            title={
              selected ? (
                <div className="flex flex-wrap items-center gap-3">
                  <NodeTypeMark type={selected.type} />
                  <div className="min-w-0">
                    <div className="truncate">{selected.name || "未命名节点"}</div>
                  </div>
                  <Badge
                    tone={PROXY_TYPE_META[selected.type].tone}
                    className="shrink-0"
                  >
                    {PROXY_TYPE_META[selected.type].glyph}{" "}
                    {PROXY_TYPE_META[selected.type].label}
                  </Badge>
                </div>
              ) : (
                "节点详情"
              )
            }
            description={selected ? nodeSubtitle(selected) : undefined}
          >
            {selected ? (
              <div className="grid gap-5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void copyText(`${selected.server}:${selected.port}`, "server:port")
                    }
                  >
                    复制 server:port
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyProxyYaml(selected)}
                    title="复制为 Mihomo/Clash Meta 单条代理 YAML"
                  >
                    复制代理 YAML
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyProxiesBlock(selected)}
                    title="复制为 `proxies:` 完整块（可直接粘贴到配置根部，含敏感字段）"
                  >
                    复制 proxies 块
                  </Button>

                  {(() => {
                    const cred = copyCredential(selected);
                    if (!cred) {
                      return (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          title="该节点无可复制凭据"
                        >
                          复制凭据
                        </Button>
                      );
                    }
                    return (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyText(cred.value, `已复制${cred.label}`)}
                        title={`复制${cred.label}（完整）`}
                      >
                        复制{cred.label}
                      </Button>
                    );
                  })()}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void copyText(JSON.stringify(selected, null, 2), "节点 JSON（包含敏感字段）")
                    }
                    title="包含敏感字段，分享前请检查"
                  >
                    复制节点 JSON
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  提示：复制的 JSON 可能包含密码/私钥等敏感字段，分享前请自行脱敏。
                </div>

                <NodeDetails node={selected} />
              </div>
            ) : null}
          </Dialog>
        </div>
      )}
    </div>
  );
}
