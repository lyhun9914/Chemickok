-- 냥 (복채 엽전): prepaid coins kept in a 복주머니, spent one reading at a time. Plus email accounts and 친구 초대.
-- Like 0001: RLS on with no policies, and the functions run only for the server's secret key.

-- ── 이메일 회원 · 초대 코드 ──
alter table public.users drop constraint if exists users_provider_check;
alter table public.users add constraint users_provider_check check (provider in ('kakao', 'naver', 'google', 'dev', 'email'));
-- scrypt$N$r$p$salt$hash, email accounts only
alter table public.users add column if not exists password_hash text;
-- short code in 초대 links (?ref=…); filled for existing rows too
alter table public.users add column if not exists ref_code text not null default substr(md5(gen_random_uuid()::text), 1, 8);
create unique index if not exists users_ref_code on public.users (ref_code);
alter table public.users add column if not exists referred_by uuid references public.users (id) on delete set null;

-- ── 복주머니 ──
create table if not exists public.wallets (
  user_id uuid primary key references public.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Every change to a balance, once: (user, reason, ref) is unique, so a retried charge or a reopened reading never counts twice.
--   charge  ref = Toss orderId          spend  ref = mode:answer-hash
--   bonus   ref = welcome / joined / invite:<user id>      refund · admin  ref = free text
create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('charge', 'spend', 'bonus', 'refund', 'admin')),
  ref text not null,
  balance_after integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index if not exists coin_ledger_user_created on public.coin_ledger (user_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.coin_ledger enable row level security;

-- Adds coins once per (user, reason, ref). → { balance, applied }
create or replace function public.coin_add(p_user uuid, p_delta integer, p_reason text, p_ref text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  b integer;
begin
  if p_delta <= 0 then
    raise exception 'coin_add: delta must be positive';
  end if;
  insert into wallets (user_id) values (p_user) on conflict do nothing;
  select balance into b from wallets where user_id = p_user for update;
  if exists (select 1 from coin_ledger where user_id = p_user and reason = p_reason and ref = p_ref) then
    return jsonb_build_object('balance', b, 'applied', false);
  end if;
  insert into coin_ledger (user_id, delta, reason, ref, balance_after) values (p_user, p_delta, p_reason, p_ref, b + p_delta);
  update wallets set balance = b + p_delta, updated_at = now() where user_id = p_user;
  return jsonb_build_object('balance', b + p_delta, 'applied', true);
end;
$$;

-- Spends coins for one reading. The same ref spent before costs nothing again. → { ok, balance, already }
create or replace function public.coin_spend(p_user uuid, p_cost integer, p_ref text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  b integer;
begin
  if p_cost <= 0 then
    raise exception 'coin_spend: cost must be positive';
  end if;
  insert into wallets (user_id) values (p_user) on conflict do nothing;
  select balance into b from wallets where user_id = p_user for update;
  if exists (select 1 from coin_ledger where user_id = p_user and reason = 'spend' and ref = p_ref) then
    return jsonb_build_object('ok', true, 'balance', b, 'already', true);
  end if;
  if b < p_cost then
    return jsonb_build_object('ok', false, 'balance', b, 'already', false);
  end if;
  insert into coin_ledger (user_id, delta, reason, ref, balance_after) values (p_user, -p_cost, 'spend', p_ref, b - p_cost);
  update wallets set balance = b - p_cost, updated_at = now() where user_id = p_user;
  return jsonb_build_object('ok', true, 'balance', b - p_cost, 'already', false);
end;
$$;

-- Only the server (service role) may move coins; the public API keys can't call these.
revoke execute on function public.coin_add(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.coin_spend(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.coin_add(uuid, integer, text, text) to service_role;
grant execute on function public.coin_spend(uuid, integer, text) to service_role;
