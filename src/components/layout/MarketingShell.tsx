import * as React from "react";

import { AppHeader, type AppHeaderNavItem } from "@/components/layout/AppHeader";
import { AppMobileMenu } from "@/components/layout/AppMobileMenu";
import { BackgroundDecor } from "@/components/layout/BackgroundDecor";
import { MarketingAuthNav } from "@/components/layout/MarketingAuthNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const MARKETING_NAV_ITEMS: AppHeaderNavItem[] = [
  { href: "/dashboard", label: "控制台", exact: true },
  { href: "/dashboard/templates", label: "模板" },
];

const MARKETING_MOBILE_NAV_ITEMS: AppHeaderNavItem[] = [
  { href: "/", label: "首页", exact: true },
  { href: "/dashboard", label: "控制台", exact: true },
  { href: "/dashboard/templates", label: "模板库" },
];

/** 营销页通用布局（首页/登录等）。包含顶部导航与页脚。 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground">
      <BackgroundDecor />

      <AppHeader
        navItems={MARKETING_NAV_ITEMS}
        desktopRight={
          <>
            <ThemeToggle showLabel={false} />
            <MarketingAuthNav />
          </>
        }
        mobileRight={
          <>
            <ThemeToggle showLabel={false} />
            <AppMobileMenu
              ariaLabel="打开菜单"
              title="菜单"
              fallbackDescription="快速导航与账号操作"
              navItems={MARKETING_MOBILE_NAV_ITEMS}
              signInLabel="登录 / 注册"
            />
          </>
        }
      />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-12">
        {children}
      </main>

      <footer className="relative border-t-2 border-border/60 bg-background/40 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          <div className="font-heading font-extrabold text-foreground">
            vlink-sub
          </div>
          <div className="mt-2">Organic / Natural · Nodes → Clash Meta（Mihomo）</div>
        </div>
      </footer>
    </div>
  );
}
