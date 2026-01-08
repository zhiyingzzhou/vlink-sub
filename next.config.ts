import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// 本项目默认启用 `output: "standalone"`（方便 Docker 自托管）。
// 在 Vercel 上不需要该选项，且保持默认输出更稳妥。
if (!process.env.VERCEL) {
  nextConfig.output = "standalone";
}

export default nextConfig;
