import { Suspense } from "react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <MarketingShell>
          <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
            <Card tone="neutral">
              <CardTitle>正在处理登录…</CardTitle>
              <CardDescription>请稍候</CardDescription>
            </Card>
          </div>
        </MarketingShell>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
