"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Link";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function MarketingAuthNav() {
  const { session, ready } = useSupabaseSession();
  const toast = useToast();

  const [signingOut, setSigningOut] = React.useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.success("已退出登录");
    } catch (e) {
      toast.error("退出失败", e instanceof Error ? e.message : undefined);
    } finally {
      setSigningOut(false);
    }
  };

  if (!ready) {
    return (
      <Badge tone="muted" className="hidden md:inline-flex">
        检测登录中…
      </Badge>
    );
  }

  if (session?.user?.email) {
    return (
      <>
        <Badge tone="muted" className="hidden max-w-[220px] truncate md:inline-flex">
          {session.user.email}
        </Badge>
        <Button variant="secondary" size="sm" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? "退出中…" : "退出"}
        </Button>
      </>
    );
  }

  return (
    <ButtonLink href="/login" variant="primary" size="sm">
      登录
    </ButtonLink>
  );
}

