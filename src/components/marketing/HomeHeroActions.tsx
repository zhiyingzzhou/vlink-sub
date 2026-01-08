"use client";

import * as React from "react";

import { ButtonLink } from "@/components/ui/Link";
import { useSupabaseSession } from "@/lib/auth/useSession";

/** 首页 Hero 区域的快捷入口按钮（根据登录态显示“登录/注册”）。 */
export function HomeHeroActions() {
  const { session, ready } = useSupabaseSession();

  return (
    <>
      <ButtonLink
        href="/dashboard"
        variant="primary"
        size="lg"
        className="w-full justify-center sm:w-auto"
      >
        进入控制台
      </ButtonLink>

      {ready && !session ? (
        <ButtonLink
          href="/login"
          variant="secondary"
          size="lg"
          className="w-full justify-center sm:w-auto"
        >
          登录 / 注册
        </ButtonLink>
      ) : null}

      <ButtonLink
        href="/dashboard/templates"
        variant="ghost"
        size="lg"
        className="w-full justify-center sm:w-auto"
      >
        模板库
      </ButtonLink>
    </>
  );
}
