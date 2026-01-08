"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ButtonLink } from "@/components/ui/Link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/ui/cn";

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function DashboardMobileMenu({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { session, ready } = useSupabaseSession();
  const toast = useToast();
  const [signingOut, setSigningOut] = React.useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.success("已退出登录");
      setOpen(false);
    } catch (e) {
      toast.error("退出失败", e instanceof Error ? e.message : undefined);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("px-4", className)}
        onClick={() => setOpen(true)}
        aria-label="打开控制台菜单"
        title="菜单"
      >
        <MenuIcon />
        <span className="hidden sm:inline">菜单</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="控制台菜单"
        description={
          ready && session?.user?.email ? (
            <span className="font-mono text-xs">{session.user.email}</span>
          ) : (
            "导航与设置"
          )
        }
        size="sm"
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="muted">主题</Badge>
            <ThemeToggle />
          </div>

          <div className="grid gap-2">
            <ButtonLink
              href="/dashboard"
              variant={isActive(pathname, "/dashboard") ? "primary" : "secondary"}
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              创建
            </ButtonLink>
            <ButtonLink
              href="/dashboard/subscriptions"
              variant={isActive(pathname, "/dashboard/subscriptions") ? "primary" : "secondary"}
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              订阅
            </ButtonLink>
            <ButtonLink
              href="/dashboard/templates"
              variant={isActive(pathname, "/dashboard/templates") ? "primary" : "secondary"}
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              模板
            </ButtonLink>
            <ButtonLink
              href="/dashboard/account"
              variant={isActive(pathname, "/dashboard/account") ? "primary" : "secondary"}
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              账号
            </ButtonLink>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-background/60 p-4 shadow-[var(--shadow-soft)]">
            {ready && session ? (
              <div className="grid gap-2">
                {session.user.email ? (
                  <Badge tone="muted" className="w-full justify-center truncate">
                    已登录：{session.user.email}
                  </Badge>
                ) : null}
                <Button variant="secondary" size="lg" onClick={onSignOut} disabled={signingOut}>
                  {signingOut ? "退出中…" : "退出登录"}
                </Button>
              </div>
            ) : (
              <ButtonLink
                href="/login"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => setOpen(false)}
              >
                登录
              </ButtonLink>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

