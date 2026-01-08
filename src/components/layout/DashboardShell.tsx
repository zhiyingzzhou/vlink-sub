"use client";

import * as React from "react";

import { AppHeader, type AppHeaderNavItem } from "@/components/layout/AppHeader";
import { AppMobileMenu } from "@/components/layout/AppMobileMenu";
import { BackgroundDecor } from "@/components/layout/BackgroundDecor";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { signOut } from "@/lib/auth/signOut";
import { useSupabaseSession } from "@/lib/auth/useSession";

const DASHBOARD_NAV_ITEMS: AppHeaderNavItem[] = [
  { href: "/dashboard", label: "创建", exact: true },
  { href: "/dashboard/subscriptions", label: "订阅" },
  { href: "/dashboard/templates", label: "模板" },
  { href: "/dashboard/account", label: "账号" },
];

/** 控制台通用布局（需要登录但允许未登录展示入口）。 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session } = useSupabaseSession();
  const { success, error } = useToast();

  // 退出登录：清理 Supabase session（前端）。
  const onSignOut = async () => {
    try {
      await signOut();
      success("已退出登录");
    } catch (e) {
      error("退出失败", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="min-h-screen text-foreground">
      <BackgroundDecor className="opacity-90" />

      <AppHeader
        navItems={DASHBOARD_NAV_ITEMS}
        desktopRight={
          <>
            {session?.user?.email ? (
              <Badge tone="muted" className="hidden max-w-[220px] truncate xl:inline-flex">
                {session.user.email}
              </Badge>
            ) : null}
            <ThemeToggle showLabel={false} />
            {session ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-4 hover:scale-100 active:scale-100"
                onClick={onSignOut}
              >
                退出
              </Button>
            ) : (
              <ButtonLink
                href="/login"
                variant="primary"
                size="sm"
                className="h-9 px-4 hover:scale-100 active:scale-100"
              >
                登录
              </ButtonLink>
            )}
          </>
        }
        mobileRight={
          <>
            <ThemeToggle showLabel={false} />
            <AppMobileMenu
              ariaLabel="打开控制台菜单"
              title="控制台菜单"
              fallbackDescription="导航与设置"
              navItems={DASHBOARD_NAV_ITEMS}
            />
          </>
        }
      />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-12">
        {children}
      </main>
    </div>
  );
}
