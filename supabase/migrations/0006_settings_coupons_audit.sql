-- 관리자 운영 도구: 가격·세일·공지 설정, 쿠폰, 관리 작업 기록, 하루 요약.

-- ───────────── 설정 (가격 · 세일 · 공지) ─────────────
-- One row per setting (pricing, sale, banner), a JSON value the app checks before use; missing rows mean the defaults
-- in the code.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- The 냥 a payment put in the 복주머니 (a 충전, with any 세일 bonus), so a refund takes back exactly that.
alter table public.payments add column if not exists coins integer;

-- ───────────── 관리 작업 기록 ─────────────
create table if not exists public.admin_actions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action text not null,
  target text,
  detail text
);
create index if not exists admin_actions_time on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;

-- ───────────── 쿠폰 ─────────────
create table if not exists public.coupons (
  code text primary key,
  coins integer not null check (coins between 1 and 100),
  max_uses integer check (max_uses is null or max_uses > 0),
  used integer not null default 0,
  expires_at timestamptz,
  social_only boolean not null default true,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.coupon_redemptions (
  code text not null references public.coupons (code) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- Uses a coupon once per member. → { ok, reason?, coins?, balance? }
-- reason: none (no such code) · off (turned off) · expired · full (all used) · used (this member already did) · social
create or replace function public.coupon_redeem(p_code text, p_user uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  c coupons%rowtype;
  r jsonb;
begin
  select * into c from coupons where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'none'); end if;
  if exists (select 1 from coupon_redemptions where code = c.code and user_id = p_user) then return jsonb_build_object('ok', false, 'reason', 'used'); end if;
  if not c.active then return jsonb_build_object('ok', false, 'reason', 'off'); end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  if c.max_uses is not null and c.used >= c.max_uses then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
  if c.social_only and exists (select 1 from users where id = p_user and provider in ('email', 'dev')) then
    return jsonb_build_object('ok', false, 'reason', 'social');
  end if;
  insert into coupon_redemptions (code, user_id) values (c.code, p_user) on conflict do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'used'); end if;
  update coupons set used = used + 1 where code = c.code;
  r := coin_add(p_user, c.coins, 'bonus', 'coupon:' || c.code);
  return jsonb_build_object('ok', true, 'coins', c.coins, 'balance', r->'balance');
end;
$$;

-- ───────────── 하루 요약 (아침 메일 · 관리자 홈) ─────────────
-- One KST day: visits, interviews, sales and refunds, new members, 냥 spent, errors.
create or replace function public.admin_day(p_day date)
returns jsonb
language sql
set search_path = public
as $$
  with t as (
    select (p_day::timestamp at time zone 'Asia/Seoul') as a, ((p_day + 1)::timestamp at time zone 'Asia/Seoul') as b
  )
  select jsonb_build_object(
    'day', p_day,
    'visits', (select count(*) from visits where day = p_day),
    'started', (select count(*) from runs where day = p_day and product not like 'game:%'),
    'results', (select count(*) from runs where day = p_day and result_at is not null),
    'games', (select count(*) from runs where day = p_day and product like 'game:%'),
    'paidCount', (select count(*) from payments, t where method = 'toss' and created_at >= t.a and created_at < t.b),
    'sales', (select coalesce(sum(amount), 0) from payments, t where method = 'toss' and created_at >= t.a and created_at < t.b),
    'refunds', (select coalesce(sum(refund_amount), 0) from payments, t where method = 'toss' and refunded_at >= t.a and refunded_at < t.b),
    'refundCount', (select count(*) from payments, t where method = 'toss' and refunded_at >= t.a and refunded_at < t.b),
    'newUsers', (select count(*) from users, t where provider <> 'dev' and created_at >= t.a and created_at < t.b),
    'coinsSpent', (select coalesce(-sum(delta), 0) from coin_ledger, t where reason = 'spend' and created_at >= t.a and created_at < t.b),
    'coupons', (select count(*) from coupon_redemptions, t where created_at >= t.a and created_at < t.b),
    'errors', (select count(*) from error_logs, t where created_at >= t.a and created_at < t.b),
    'errorKinds', (select count(distinct fingerprint) from error_logs, t where created_at >= t.a and created_at < t.b)
  )
  from t;
$$;

revoke execute on function public.coupon_redeem(text, uuid) from public, anon, authenticated;
revoke execute on function public.admin_day(date) from public, anon, authenticated;
grant execute on function public.coupon_redeem(text, uuid) to service_role;
grant execute on function public.admin_day(date) to service_role;
