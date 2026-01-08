import type { Metadata } from "next";
import "./globals.css";

import { bodyFont, headingFont, scSansFont, scSerifFont } from "@/lib/fonts";
import { UIProviders } from "@/components/ui/Providers";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

export const metadata: Metadata = {
  title: "vlink-hub",
  description: "节点转换与订阅管理服务（Clash Meta / Mihomo）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
