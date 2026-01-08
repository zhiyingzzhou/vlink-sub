import localFont from "next/font/local";

/**
 * 字体定义（本地 woff2）。
 *
 * 使用 `next/font/local`：
 * - 自动生成 `@font-face`
 * - 通过 CSS 变量（`--font-*`）注入到 `src/app/layout.tsx`
 */
export const headingFont = localFont({
  src: [
    {
      path: "../assets/fonts/fraunces/fraunces-latin.woff2",
      weight: "600 800",
      style: "normal",
    },
  ],
  variable: "--font-heading",
  display: "swap",
});

export const bodyFont = localFont({
  src: [
    {
      path: "../assets/fonts/nunito/nunito-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const scSansFont = localFont({
  src: [
    {
      path: "../assets/fonts/noto-sans-sc/noto-sans-sc.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-sc-sans",
  display: "swap",
});

export const scSerifFont = localFont({
  src: [
    {
      path: "../assets/fonts/noto-serif-sc/noto-serif-sc.woff2",
      weight: "600 900",
      style: "normal",
    },
  ],
  variable: "--font-sc-serif",
  display: "swap",
});
