#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * 将仓库内置的公开模板同步到 Supabase `templates` 表。
 *
 * - 读取 `supabase/templates/public/index.json` 作为索引
 * - 逐个加载 YAML 内容并 upsert（onConflict: id）
 * - 支持 `--dry-run` 仅打印将同步的模板列表
 *
 * 注意：写入公开模板需要 `SUPABASE_SERVICE_ROLE_KEY` 绕过 RLS。
 */
function parseDotenv(content) {
  const out = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!key) continue;

    const quote = value[0];
    if ((quote === "'" || quote === "\"") && value[value.length - 1] === quote) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** 加载 `.env` 文件并注入到 `process.env`（不覆盖已有 env）。 */
async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = parseDotenv(content);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // ignore
  }
}

/** 判断 CLI 是否包含某个 flag（例如 `--dry-run`）。 */
function getFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(__dirname, "..");

  // 允许本地用 .env / .env.local
  await loadEnvFile(path.join(root, ".env"));
  await loadEnvFile(path.join(root, ".env.local"));

  const supabaseUrl =
    (process.env.SUPABASE_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  const dryRun = getFlag("--dry-run");

  const indexPath = path.join(root, "supabase", "templates", "public", "index.json");
  const indexRaw = await fs.readFile(indexPath, "utf8");
  const entries = JSON.parse(indexRaw);

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`模板索引为空：${indexPath}`);
  }

  const baseDir = path.dirname(indexPath);
  const templates = [];

  for (const entry of entries) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const title = typeof entry?.title === "string" ? entry.title.trim() : "";
    const file = typeof entry?.file === "string" ? entry.file.trim() : "";
    if (!id || !title || !file) {
      throw new Error(`模板索引项不完整：${JSON.stringify(entry)}`);
    }
    const filePath = path.join(baseDir, file);
    const content = (await fs.readFile(filePath, "utf8")).trim();
    if (!content) {
      throw new Error(`模板内容为空：${filePath}`);
    }
    templates.push({
      id,
      user_id: null,
      title,
      content,
      is_public: true,
    });
  }

  if (dryRun) {
    console.log(`[dry-run] 将同步 ${templates.length} 个公开模板：`);
    for (const t of templates) {
      console.log(`- ${t.id} ${t.title}`);
    }
    return;
  }

  if (!supabaseUrl) {
    throw new Error("缺少 SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY（需要 service_role 才能绕过 RLS 写入公开模板）");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("templates")
    .upsert(templates, { onConflict: "id" })
    .select("id, title, is_public, user_id, updated_at");

  if (error) {
    throw new Error(error.message);
  }

  console.log(`已同步公开模板：${data?.length ?? templates.length} 个`);
}

main().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
