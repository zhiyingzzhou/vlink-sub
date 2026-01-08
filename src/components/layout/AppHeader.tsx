"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { ButtonLink } from "@/components/ui/Link";
import { cn } from "@/lib/ui/cn";

export type AppHeaderNavItem = {
  href: string;
  label: React.ReactNode;
  /** 是否严格匹配（仅 pathname === href 时高亮）。 */
  exact?: boolean;
};

function isActive(pathname: string, item: AppHeaderNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function HeaderNavLink({ item }: { item: AppHeaderNavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item);

  return (
    <ButtonLink
      href={item.href}
      aria-current={active ? "page" : undefined}
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 px-4 hover:scale-100 active:scale-100",
        "shadow-none hover:shadow-none",
        active
          ? "bg-muted/70 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {item.label}
    </ButtonLink>
  );
}

export function AppHeader({
  navItems,
  desktopRight,
  mobileRight,
  brandName = "vlink-sub",
  brandHref = "/",
  className,
}: {
  navItems?: AppHeaderNavItem[];
  desktopRight: React.ReactNode;
  mobileRight: React.ReactNode;
  brandName?: string;
  brandHref?: string;
  className?: string;
}) {
  const hasNav = Boolean(navItems?.length);

  return (
    <header className={cn("sticky top-4 z-40", className)}>
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between gap-3 rounded-full border border-border/60 bg-card/70 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2">
            <ButtonLink
              href={brandHref}
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-3 justify-start gap-3 font-heading text-sm font-extrabold tracking-tight",
                "hover:scale-100 active:scale-100"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/60 shadow-[var(--shadow-soft)]">
                <Image src="/logo-mark.svg" alt="" width={20} height={20} />
              </span>
              <span className="hidden sm:inline">{brandName}</span>
            </ButtonLink>

            {hasNav ? <span className="hidden h-6 w-px bg-border/60 md:block" /> : null}

            {hasNav ? (
              <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
                {navItems!.map((item) => (
                  <HeaderNavLink key={item.href} item={item} />
                ))}
              </nav>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{desktopRight}</div>
            <div className="flex items-center gap-2 md:hidden">{mobileRight}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

