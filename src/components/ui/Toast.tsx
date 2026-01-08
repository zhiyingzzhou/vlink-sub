"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/ui/cn";

type ToastVariant = "info" | "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
  durationMs: number;
};

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastApi = {
  push: (opts: ToastOptions) => void;
  info: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

function tone(t: ToastVariant): { badge: string; shadow: string } {
  if (t === "success") {
    return { badge: "bg-primary text-primary-foreground", shadow: "shadow-[var(--shadow-float)]" };
  }
  if (t === "error") {
    return { badge: "bg-destructive text-destructive-foreground", shadow: "shadow-[var(--shadow-float)]" };
  }
  return { badge: "bg-accent text-accent-foreground", shadow: "shadow-[var(--shadow-float)]" };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (opts: ToastOptions) => {
      const title = (opts.title || "").trim();
      if (!title) return;
      const item: ToastItem = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title,
        description: opts.description?.trim() || undefined,
        variant: opts.variant || "info",
        createdAt: Date.now(),
        durationMs: Math.max(1200, Math.min(10_000, opts.durationMs ?? 3200)),
      };

      setItems((prev) => [...prev, item]);

      window.setTimeout(() => remove(item.id), item.durationMs);
    },
    [remove]
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      push,
      info: (title, description) => push({ title, description, variant: "info" }),
      success: (title, description) => push({ title, description, variant: "success" }),
      error: (title, description) => push({ title, description, variant: "error" }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-6 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:w-[420px]">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const meta = tone(item.variant);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "pointer-events-auto mb-3 rounded-[2rem] border border-border/60 bg-card/90 p-4 backdrop-blur-md",
        meta.shadow
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full",
            "border border-border/60 shadow-[var(--shadow-soft)]",
            meta.badge
          )}
          aria-hidden="true"
        >
          <span className="font-heading text-sm font-extrabold">
            {item.variant === "success" ? "✓" : item.variant === "error" ? "!" : "i"}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm font-extrabold">{item.title}</div>
          {item.description ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "border border-border/60 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground",
            "shadow-[var(--shadow-soft)]",
            "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
            "hover:bg-background hover:text-foreground hover:shadow-[var(--shadow-soft-hover)] hover:scale-105",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast 必须在 ToastProvider 内使用");
  }
  return ctx;
}
