"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/ui/cn";

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    )
  );
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
  });
}

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  closeLabel?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "关闭",
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const lastActiveRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    lastActiveRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      (focusables[0] || panel).focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    const el = lastActiveRef.current;
    if (el && typeof el.focus === "function") {
      try {
        el.focus();
      } catch {
        // ignore
      }
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const sizeClass =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
        ? "max-w-3xl"
        : "max-w-xl";

  if (typeof document === "undefined") return null;

  const ease = [0.22, 1, 0.36, 1] as const;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => onOpenChange(false)}
            aria-label={closeLabel}
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.45, ease }}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={cn(
              "relative w-full",
              sizeClass,
              "rounded-[2.5rem] border border-border/60 bg-card/90 backdrop-blur-md",
              "shadow-[var(--shadow-float)]",
              "px-7 py-6"
            )}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title ? (
                  <div className="font-heading text-lg font-extrabold tracking-tight">
                    {title}
                  </div>
                ) : null}
                {description ? (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "inline-flex items-center justify-center rounded-full",
                  "border border-border/60 bg-background/60 px-4 py-2 text-xs font-semibold text-muted-foreground",
                  "shadow-[var(--shadow-soft)]",
                  "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
                  "hover:bg-background hover:text-foreground hover:shadow-[var(--shadow-soft-hover)] hover:scale-105",
                  "active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                {closeLabel}
              </button>
            </div>

            <div className="mt-5">{children}</div>

            {footer ? <div className="mt-6">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
