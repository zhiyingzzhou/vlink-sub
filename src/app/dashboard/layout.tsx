import * as React from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";

/** 控制台路由组统一套用 DashboardShell。 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
