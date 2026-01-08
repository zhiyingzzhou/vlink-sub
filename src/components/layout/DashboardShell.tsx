"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { BackgroundDecor } from "@/components/layout/BackgroundDecor";
import { DashboardMobileMenu } from "@/components/layout/DashboardMobileMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <ButtonLink
      href={href}
      variant={active ? "primary" : "ghost"}
      size="sm"
    >
      {children}
    </ButtonLink>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session } = useSupabaseSession();
  const { success, error } = useToast();

  const onSignOut = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      success("已退出登录");
    } catch (e) {
      error("退出失败", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="min-h-screen text-foreground">
      <BackgroundDecor className="opacity-90" />

      <header className="sticky top-4 z-40">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <div className="flex items-center justify-between gap-3 rounded-full border border-border/60 bg-card/70 px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2">
              <ButtonLink
                href="/"
                variant="ghost"
                size="sm"
                className="font-heading text-sm font-extrabold"
              >
                vlink-hub
              </ButtonLink>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                控制台
              </span>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <NavItem href="/dashboard">创建</NavItem>
              <NavItem href="/dashboard/subscriptions">订阅</NavItem>
              <NavItem href="/dashboard/templates">模板</NavItem>
              <NavItem href="/dashboard/account">账号</NavItem>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                {session?.user?.email ? (
                  <Badge
                    tone="muted"
                    className="hidden max-w-[240px] truncate lg:inline-flex"
                  >
                    {session.user.email}
                  </Badge>
                ) : null}
                <ThemeToggle />
                {session ? (
                  <Button variant="secondary" size="sm" onClick={onSignOut}>
                    退出
                  </Button>
                ) : (
                  <ButtonLink href="/login" variant="primary" size="sm">
                    登录
                  </ButtonLink>
                )}
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <ThemeToggle />
                <DashboardMobileMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-12">
        {children}
      </main>
    </div>
  );
}
