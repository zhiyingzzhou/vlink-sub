"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import type { AppHeaderNavItem } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ButtonLink } from "@/components/ui/Link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { signOut } from "@/lib/auth/signOut";
import { useSupabaseSession } from "@/lib/auth/useSession";
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

function isActive(pathname: string, item: AppHeaderNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** 顶部栏的移动端菜单（Dialog 弹出）。 */
export function AppMobileMenu({
  className,
  ariaLabel,
  title,
  fallbackDescription,
  navItems,
  signInHref = "/login",
  signInLabel = "登录",
}: {
  className?: string;
  ariaLabel: string;
  title: string;
  fallbackDescription: React.ReactNode;
  navItems: AppHeaderNavItem[];
  signInHref?: string;
  signInLabel?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { session, ready } = useSupabaseSession();
  const toast = useToast();

  const [signingOut, setSigningOut] = React.useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
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
        className={cn(
          "h-9 w-9 px-0 hover:scale-100 active:scale-100 sm:w-auto sm:px-4",
          className
        )}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        title="菜单"
      >
        <MenuIcon />
        <span className="hidden sm:inline">菜单</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={
          ready && session?.user?.email ? (
            <span className="font-mono text-xs">{session.user.email}</span>
          ) : (
            fallbackDescription
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
            {navItems.map((item) => (
              <ButtonLink
                key={item.href}
                href={item.href}
                variant={isActive(pathname, item) ? "primary" : "secondary"}
                size="lg"
                className="w-full justify-center"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </ButtonLink>
            ))}
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
                href={signInHref}
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => setOpen(false)}
              >
                {signInLabel}
              </ButtonLink>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
