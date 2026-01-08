import * as React from "react";

import { BackgroundDecor } from "@/components/layout/BackgroundDecor";
import { MarketingAuthNav } from "@/components/layout/MarketingAuthNav";
import { MarketingMobileMenu } from "@/components/layout/MarketingMobileMenu";
import { ButtonLink } from "@/components/ui/Link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground">
      <BackgroundDecor />

      <header className="sticky top-4 z-40">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <div className="flex items-center justify-between gap-3 rounded-full border border-border/60 bg-card/70 px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur-md">
            <ButtonLink
              href="/"
              variant="ghost"
              size="sm"
              className="font-heading text-sm font-extrabold"
            >
              vlink-hub
            </ButtonLink>
            <nav className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <ButtonLink href="/dashboard" variant="secondary" size="sm">
                  控制台
                </ButtonLink>
                <ButtonLink href="/dashboard/templates" variant="secondary" size="sm">
                  模板
                </ButtonLink>
                <MarketingAuthNav />
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <ThemeToggle />
                <MarketingMobileMenu />
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-12">
        {children}
      </main>

      <footer className="relative border-t-2 border-border/60 bg-background/40 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          <div className="font-heading font-extrabold text-foreground">
            vlink-hub
          </div>
          <div className="mt-2">Organic / Natural · Nodes → Clash Meta（Mihomo）</div>
        </div>
      </footer>
    </div>
  );
}
