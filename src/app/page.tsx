import { MarketingShell } from "@/components/layout/MarketingShell";
import { HomeHeroActions } from "@/components/marketing/HomeHeroActions";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="grid gap-10 md:grid-cols-2 md:items-center">
        <PageHeader
          badge={<Badge tone="primary">Nodes → Mihomo · Organic / Natural</Badge>}
          title="vlink-sub"
          description="把你从面板 / 客户端 / 频道 / 3x-ui 导出的节点混杂文本一键解析成 Clash Meta（Mihomo）订阅：全协议解析、模板快照、短链防扫库、ETag/304 缓存与加密存储。"
          actions={<HomeHeroActions />}
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="secondary" className="px-4 py-2 text-sm">
              短链 + secret 防扫库
            </Badge>
            <Badge tone="accent" className="px-4 py-2 text-sm">
              订阅快照稳定输出
            </Badge>
            <Badge tone="muted" className="px-4 py-2 text-sm">
              ETag/304 减少流量
            </Badge>
            <Badge tone="neutral" className="px-4 py-2 text-sm">
              AES-256-GCM 加密原文
            </Badge>
          </div>
        </PageHeader>

        <div className="grid gap-4">
          <Card interactive tone="accent">
            <CardTitle>全协议解析</CardTitle>
            <CardDescription>
              vmess / vless（Reality）/ trojan / ss / wireguard；逐条错误隔离，不崩全局。
            </CardDescription>
          </Card>
          <Card interactive tone="primary">
            <CardTitle>规则模板快照</CardTitle>
            <CardDescription>
              创建订阅时把模板写入快照；模板更新不会影响历史订阅，输出稳定可控。
            </CardDescription>
          </Card>
          <Card interactive tone="secondary">
            <CardTitle>缓存友好</CardTitle>
            <CardDescription>
              导出支持 ETag/If-None-Match，尽量 304（不回传 YAML）；适合规模化。
            </CardDescription>
          </Card>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-heading text-2xl font-extrabold tracking-tight">
          快速开始
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card tone="neutral" interactive>
            <CardTitle>1) 初始化</CardTitle>
            <CardDescription>
              在 Supabase SQL Editor 运行 <span className="font-mono">supabase/init.sql</span>。
            </CardDescription>
          </Card>
          <Card tone="neutral" interactive>
            <CardTitle>2) 同步模板</CardTitle>
            <CardDescription>
              配好 <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span>，运行{" "}
              <span className="font-mono">pnpm supabase:sync-templates</span>。
            </CardDescription>
          </Card>
          <Card tone="neutral" interactive>
            <CardTitle>3) 生成订阅</CardTitle>
            <CardDescription>
              粘贴节点 → 选模板/有效期 → 生成短链，直接导入 Mihomo。
            </CardDescription>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
