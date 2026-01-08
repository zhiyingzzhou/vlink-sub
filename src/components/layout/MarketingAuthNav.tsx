"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Link";
import { useToast } from "@/components/ui/Toast";
import { signOut } from "@/lib/auth/signOut";
import { useSupabaseSession } from "@/lib/auth/useSession";

/** 营销页右上角的账号入口：展示登录态/退出/登录按钮。 */
export function MarketingAuthNav() {
  const { session, ready } = useSupabaseSession();
  const toast = useToast();

  const [signingOut, setSigningOut] = React.useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
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
        <Button
          variant="secondary"
          size="sm"
          className="h-9 px-4 hover:scale-100 active:scale-100"
          onClick={onSignOut}
          disabled={signingOut}
        >
          {signingOut ? "退出中…" : "退出"}
        </Button>
      </>
    );
  }

  return (
    <ButtonLink
      href="/login"
      variant="primary"
      size="sm"
      className="h-9 px-4 hover:scale-100 active:scale-100"
    >
      登录
    </ButtonLink>
  );
}
