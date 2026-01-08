-- 修复：/s 导出 RPC 报错 “function digest(text, unknown) does not exist”
-- 原因：Supabase 默认把 pgcrypto 安装在 schema `extensions`，但 security definer 函数 search_path 只设了 public，导致找不到 digest。
-- 用法：Supabase Dashboard → SQL Editor 运行本文件（可重复执行）。

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.get_subscription_export(
  p_short_code text,
  p_secret text,
  p_if_none_match text default null
)
returns table (
  id uuid,
  config_cache text,
  config_hash text,
  expires_at timestamptz,
  disabled boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
    select
      s.id,
      case
        when p_if_none_match is not null
             and p_if_none_match like ('%' || '\"' || s.config_hash || '\"' || '%')
          then null
        else s.config_cache
      end as config_cache,
      s.config_hash,
      s.expires_at,
      s.disabled
    from public.subscriptions s
    where lower(s.short_code) = lower(p_short_code)
      and s.secret_hash = encode(digest(convert_to(p_secret, 'utf8'), 'sha256'), 'hex')
    limit 1;
end;
$$;

revoke all on function public.get_subscription_export(text, text, text) from public;
grant execute on function public.get_subscription_export(text, text, text) to anon, authenticated;

commit;

