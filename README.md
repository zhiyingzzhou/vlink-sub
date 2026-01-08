# vlink-sub

面向规模化的节点转换与订阅管理服务：解析任意来源的节点混杂文本 → 生成 Clash Meta（Mihomo）订阅，并支持模板快照、短链防扫库、ETag/304 缓存与加密存储。

## 功能概览

- **全协议解析**：vmess / vless（Reality）/ trojan / ss / wireguard
- **模板系统**：公开模板 + “我的模板”增删改；订阅创建时写入 **template_snapshot**，模板更新不影响老订阅
- **安全模型**：
  - `raw_data` 使用 **AES-256-GCM** 加密存储（支持 `key_id/keyring` 轮换）
  - 导出地址采用 **shortCode + secret** 两段 token；secret 不落库，仅存 `sha256(secret)`
  - 管理端走 Supabase Auth（JWT）+ RLS；导出端 `/s/*` 只读 RPC 查询
- **性能**：导出支持 **ETag/If-None-Match**，尽量 304（不回传 YAML）
- **导入体验**：控制台提供订阅链接一键复制、二维码、以及（部分客户端支持的）`clash://install-config` 一键导入

## 初始化（Supabase）

1. 创建 Supabase 项目
2. 打开 **SQL Editor**，运行：`supabase/init.sql`
3. 同步内置公开模板（推荐）：`pnpm supabase:sync-templates`（需要 `SUPABASE_SERVICE_ROLE_KEY`）
4. 打开 **Authentication → Email Templates**，把 `supabase/email-templates/magic-link.html` 粘贴到 **Magic Link** 模板（可选，但推荐）

## 环境变量

建议先用模板生成本地 `.env`：

```bash
cp .env.example .env
```

然后编辑 `.env`，把占位符替换为你的真实值（不要提交 `.env`）。

前端（浏览器可见）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 可选：`NEXT_PUBLIC_HCAPTCHA_SITE_KEY`（配合 Supabase Dashboard 启用 Captcha，用于登录防刷）

服务端（仅 Node.js）：

- `DATA_ENCRYPTION_KEY`：**32 字节 base64**（AES-256-GCM）
- 可选：`DATA_ENCRYPTION_KEY_ID`（默认 `k1`）
- 可选：`DATA_ENCRYPTION_KEYRING`：逗号分隔 `id=base64`，用于密钥轮换读取旧数据
- 可选：`SUPABASE_SERVICE_ROLE_KEY`（只有在你需要执行 service_role RPC/后台任务时才需要）
- 可选：`DOWNLOAD_COUNT_MIN_INTERVAL_SECONDS`（默认 `600`，同一订阅写库最小间隔，去抖；推荐：生产 `600` / 测试 `60` / 开发 `0` 不建议上生产）
- 可选：登录防刷（单实例内存限流）
  - `AUTH_OTP_WINDOW_SECONDS`、`AUTH_OTP_LIMIT_PER_IP`、`AUTH_OTP_LIMIT_PER_EMAIL`、`AUTH_OTP_LIMIT_PER_IP_EMAIL`

生成示例：

```bash
openssl rand -base64 32
```

## 本地开发

```bash
pnpm dev
```

## Vercel 一键部署

> 说明：本项目依赖 Supabase（Auth + Postgres）。一键部署负责“把 Next.js 部署上线”，Supabase 需要你先准备好。

### 1) 准备 Supabase

1. 创建 Supabase 项目
2. Supabase Dashboard → **SQL Editor** 运行：`supabase/init.sql`
3. （可选，但推荐）同步内置公开模板：本地配置 `SUPABASE_SERVICE_ROLE_KEY` 后运行 `pnpm supabase:sync-templates`

### 2) 一键部署到 Vercel

方式 A：Deploy Button（需要先把仓库推到 GitHub）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<YOUR_GITHUB_REPO_URL>)

方式 B：Vercel Dashboard → **Add New… → Project** → 导入你的仓库

在 Vercel 项目里配置环境变量（至少需要这些）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATA_ENCRYPTION_KEY`（32 字节 base64；生成：`openssl rand -base64 32`）

可选变量见：`.env.example`（例如 `SUPABASE_SERVICE_ROLE_KEY`、`NEXT_PUBLIC_HCAPTCHA_SITE_KEY` 等）。

### 3) 配置登录回调（Supabase Auth）

Supabase Dashboard → Authentication → URL Configuration：

- **Site URL**：填你的线上域名（例如 `https://your-app.vercel.app`）
- **Redirect URLs**：至少加入
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`（本地开发）

如果你启用了 Preview 部署，把对应 Preview 域名的 `/auth/callback` 也加入（否则邮件跳转会报 redirect 不允许）。

## Docker 部署

本项目已启用 Next.js `output: "standalone"`，可直接用 Docker 构建并运行。

注意：`NEXT_PUBLIC_*` 变量会在构建期写入前端 bundle，生产环境通常需要 **按环境构建镜像**。

### 构建镜像

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t vlink-sub:latest .
```

### 运行容器

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  vlink-sub:latest
```

访问：`http://localhost:3000`

## 路由说明

- `/`：Landing
- `/login`：邮箱魔法链接登录（Supabase Auth）
- `/dashboard`：创建订阅（解析 + 模板预览 + 有效期）
- `/dashboard/subscriptions`：我的订阅列表
- `/dashboard/subscriptions/[id]`：订阅详情（重置 secret / 重新生成配置 / 原文与配置预览）
- `/dashboard/templates`：模板管理（公开模板 + 我的模板）
- `/dashboard/templates/[id]`：模板详情（只读/可编辑）
- `/dashboard/account`：账号与配置检查
- `/s/[shortCode]/[secret]`：订阅导出（Clash/Mihomo 导入地址）
- `/s/[shortCode]?secret=<secret>`：兼容格式（仍需 secret）
- `/s/*?download=1`：强制以附件下载（否则默认 inline，浏览器可在线查看）

## API（供前端调用）

- 模板：
  - `GET /api/templates`、`POST /api/templates`
  - `GET/PATCH/DELETE /api/templates/[id]`
- 订阅：
  - `GET /api/subscriptions`、`POST /api/subscriptions`（服务端落库生成真实 `short_code/secret`）
  - `GET/PATCH/DELETE /api/subscriptions/[id]`
  - `POST /api/subscriptions/[id]/rotate-secret`
  - `POST /api/subscriptions/[id]/regenerate`（重新生成 `config_cache/config_hash`，可选切换模板/更新原文）
  - `GET /api/subscriptions/[id]/raw`（解密返回原文）
  - `GET /api/subscriptions/[id]/config`（返回 YAML）

## 规模化建议（千万级）

- `/s/*` 的 **限流** 当前为内存实现，仅适合单实例；生产建议 Redis/边缘/WAF
- `download_count` 不建议每次请求写库；当前已用 `DOWNLOAD_COUNT_MIN_INTERVAL_SECONDS` 去抖（默认 10 分钟最多 +1），真实统计建议用日志/分析平台聚合
