-- vlink-sub Supabase 初始化脚本（PostgreSQL）
-- 运行位置：Supabase Dashboard → SQL Editor

begin;

-- Extensions
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 让本脚本里未显式写 schema 的 pgcrypto 函数（如 gen_random_uuid）也能正常解析
set local search_path = public, extensions;

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crockford Base32（不包含 I/L/O/U，适合短链；大小写不敏感由应用层规范化）
create or replace function public.gen_crockford_base32(len int)
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea;
  i int;
  idx int;
  out text := '';
begin
  if len is null or len < 1 then
    raise exception 'len must be >= 1';
  end if;

  bytes := gen_random_bytes(len);
  for i in 0..len-1 loop
    idx := get_byte(bytes, i) % 32;
    out := out || substr(alphabet, idx + 1, 1);
  end loop;
  return out;
end;
$$;

create or replace function public.gen_short_code(len int default 8)
returns text
language sql
volatile
as $$
  select public.gen_crockford_base32(len);
$$;

-- 1) profiles：用户信息
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, updated_at)
  values (new.id, new.email, now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) templates：Clash 规则模板
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.templates
  alter column is_public set default false;

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
before update on public.templates
for each row
execute function public.set_updated_at();

alter table public.templates enable row level security;

create index if not exists templates_user_id_idx
on public.templates (user_id);

drop policy if exists "templates_select_public" on public.templates;
drop policy if exists "templates_select_public_or_own" on public.templates;
create policy "templates_select_public_or_own"
on public.templates
for select
to public
using (is_public = true or auth.uid() = user_id);

drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own"
on public.templates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own"
on public.templates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own"
on public.templates
for delete
to authenticated
using (auth.uid() = user_id);

-- 2.1) 公开模板不写死在 SQL（更易维护）
-- 在本项目里，公开模板定义在 `supabase/templates/public/*`，并通过脚本同步到表：
-- `pnpm supabase:sync-templates`（需要 SUPABASE_SERVICE_ROLE_KEY）

-- 3) subscriptions：转换配置与加密原文
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  raw_data text not null,
  template_id uuid references public.templates(id) on delete set null,
  template_snapshot text not null default '',
  config_cache text not null,
  config_hash text not null,
  secret_hash text not null,
  short_code text not null default public.gen_short_code(8),
  download_count bigint not null default 0,
  last_downloaded_at timestamptz,
  expires_at timestamptz,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_short_code_len check (char_length(short_code) between 8 and 10),
  constraint subscriptions_short_code_format check (upper(short_code) ~ '^[0-9A-HJKMNPQRSTVWXYZ]{8,10}$'),
  constraint subscriptions_secret_hash_len check (char_length(secret_hash) = 64),
  constraint subscriptions_config_hash_len check (char_length(config_hash) = 64)
);

alter table public.subscriptions
  add column if not exists template_snapshot text not null default '';

alter table public.subscriptions
  add column if not exists config_cache text;

alter table public.subscriptions
  add column if not exists config_hash text;

alter table public.subscriptions
  add column if not exists secret_hash text;

alter table public.subscriptions
  add column if not exists last_downloaded_at timestamptz;

alter table public.subscriptions
  add column if not exists expires_at timestamptz;

alter table public.subscriptions
  add column if not exists disabled boolean not null default false;

alter table public.subscriptions
  alter column disabled set default false;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop index if exists subscriptions_short_code_uidx;
create unique index if not exists subscriptions_short_code_uidx
on public.subscriptions (lower(short_code));

create index if not exists subscriptions_user_id_idx
on public.subscriptions (user_id);

create index if not exists subscriptions_expires_at_idx
on public.subscriptions (expires_at);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_owner_all" on public.subscriptions;
create policy "subscriptions_owner_all"
on public.subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4) RPC：下载次数自增（建议服务端用 service_role 调用）
create or replace function public.increment_subscription_download_count(
  subscription_id uuid,
  min_interval_seconds int default 600
)
returns bigint
language plpgsql
as $$
declare
  new_count bigint;
begin
  update public.subscriptions
  set download_count = download_count + 1,
      last_downloaded_at = now()
  where id = subscription_id
    and (
      last_downloaded_at is null
      or last_downloaded_at < now() - make_interval(secs => min_interval_seconds)
    )
  returning download_count into new_count;

  if new_count is null then
    select download_count into new_count
    from public.subscriptions
    where id = subscription_id;
  end if;

  return new_count;
end;
$$;

revoke all on function public.increment_subscription_download_count(uuid, int) from public;
grant execute on function public.increment_subscription_download_count(uuid, int) to service_role;

-- 5) RPC：只读导出订阅（shortCode + secret）
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
