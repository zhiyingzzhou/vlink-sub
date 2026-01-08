"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

type ConfirmVariant = "primary" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmRequest = ConfirmOptions & {
  id: string;
  resolve: (value: boolean) => void;
};

type ConfirmApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = React.useState<ConfirmRequest | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    const title = (opts.title || "").trim();
    if (!title) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      setReq({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title,
        description: opts.description,
        confirmText: opts.confirmText,
        cancelText: opts.cancelText,
        variant: opts.variant,
        resolve,
      });
    });
  }, []);

  const close = React.useCallback(() => {
    setReq(null);
  }, []);

  const onCancel = React.useCallback(() => {
    if (!req) return;
    req.resolve(false);
    close();
  }, [close, req]);

  const onConfirm = React.useCallback(() => {
    if (!req) return;
    req.resolve(true);
    close();
  }, [close, req]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={Boolean(req)}
        onOpenChange={(o) => {
          if (!o) onCancel();
        }}
        title={req?.title}
        description={req?.description}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onCancel}>
              {req?.cancelText || "取消"}
            </Button>
            <Button
              variant={req?.variant === "danger" ? "destructive" : "primary"}
              onClick={onConfirm}
            >
              {req?.confirmText || "确认"}
            </Button>
          </div>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm 必须在 ConfirmProvider 内使用");
  }
  return ctx;
}

