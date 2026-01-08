import type { Metadata } from "next";
import "./globals.css";

import { bodyFont, headingFont, scSansFont, scSerifFont } from "@/lib/fonts";
import { UIProviders } from "@/components/ui/Providers";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

export const metadata: Metadata = {
  title: "vlink-sub",
  description: "节点转换与订阅管理服务（Clash Meta / Mihomo）",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 首屏同步写入主题 dataset，避免 hydration 前闪烁（FOUC）。
  const themeInitScript = `(()=>{try{const k=${JSON.stringify(
    THEME_STORAGE_KEY
  )};const p=localStorage.getItem(k)||"system";const m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;const r=p==="system"?(m?"dark":"light"):(p==="dark"?"dark":"light");document.documentElement.dataset.theme=r;document.documentElement.dataset.themePref=p;}catch{}})();`;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${scSansFont.variable} ${scSerifFont.variable} antialiased`}
      >
        <UIProviders>{children}</UIProviders>
      </body>
    </html>
  );
}
