"use client";

import * as React from "react";

import { ConfirmProvider } from "@/components/ui/Confirm";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

/** 应用级 UI Provider 汇总（主题/Toast/Confirm）。 */
export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
