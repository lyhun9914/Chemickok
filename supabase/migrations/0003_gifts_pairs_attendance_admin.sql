-- 냥 선물 · 맞궁합 초대장 · 출석 보상 · 관리자. Same rules as before: RLS on with no policies, functions for the
-- service role only.

alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in ('charge', 'spend', 'bonus', 'refund', 'admin', 'gift'));

-- ── 출석 ──
create table if not exists public.attendance (
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.attendance enable row level security;

-- Stamps today (KST date from the server) and pays p_coins on every p_every-th day in a row. → { streak, rewarded }
create or replace function public.checkin(p_user uuid, p_day date, p_every integer, p_coins integer)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  n integer := 0;
  d date := p_day;
  paid boolean := false;
begin
  insert into attendance (user_id, day) values (p_user, p_day) on conflict do nothing;
  while n < 1000 and exists (select 1 from attendance where user_id = p_user and day = d) loop
    n := n + 1;
    d := d - 1;
  end loop;
  if p_every > 0 and p_coins > 0 and n % p_every = 0 then
    paid := (coin_add(p_user, p_coins, 'bonus', 'streak:' || p_day::text) ->> 'applied')::boolean;
  end if;
  return jsonb_build_object('streak', n, 'rewarded', paid);
end;
$$;

-- ── 냥 선물 ──
create table if not exists public.gifts (
  id text primary key,
  from_user uuid references public.users (id) on delete set null,
  from_name text not null,
  coins integer not null check (coins > 0),
  message text not null default '',
  claimed_by uuid references public.users (id) on delete set null,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gifts_from on public.gifts (from_user, created_at desc);
alter table public.gifts enable row level security;

-- Takes the coins out of the sender's 복주머니 and opens the gift. → { ok, balance }
create or replace function public.gift_send(p_user uuid, p_id text, p_coins integer, p_name text, p_message text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  b integer;
begin
  if p_coins <= 0 then
    raise exception 'gift_send: coins must be positive';
  end if;
  insert into wallets (user_id) values (p_user) on conflict do nothing;
  select balance into b from wallets where user_id = p_user for update;
  if b < p_coins then
    return jsonb_build_object('ok', false, 'balance', b);
  end if;
  insert into gifts (id, from_user, from_name, coins, message) values (p_id, p_user, p_name, p_coins, p_message);
  insert into coin_ledger (user_id, delta, reason, ref, balance_after) values (p_user, -p_coins, 'gift', 'send:' || p_id, b - p_coins);
  update wallets set balance = b - p_coins, updated_at = now() where user_id = p_user;
  return jsonb_build_object('ok', true, 'balance', b - p_coins);
end;
$$;

-- Hands an open gift to the first person who claims it. → { ok, reason?, coins, balance }
create or replace function public.gift_claim(p_id text, p_user uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g gifts%rowtype;
  r jsonb;
begin
  select * into g from gifts where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'none');
  end if;
  if g.cancelled_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'cancelled');
  end if;
  if g.claimed_by is not null then
    return jsonb_build_object('ok', g.claimed_by = p_user, 'reason', case when g.claimed_by = p_user then 'mine' else 'taken' end, 'coins', g.coins);
  end if;
  if g.from_user = p_user then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  update gifts set claimed_by = p_user, claimed_at = now() where id = p_id;
  r := coin_add(p_user, g.coins, 'gift', 'recv:' || p_id);
  return jsonb_build_object('ok', true, 'coins', g.coins, 'balance', (r ->> 'balance')::integer);
end;
$$;

-- The sender takes back a gift nobody has claimed. → { ok, balance? }
create or replace function public.gift_cancel(p_id text, p_user uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g gifts%rowtype;
  r jsonb;
begin
  select * into g from gifts where id = p_id for update;
  if not found or g.from_user is distinct from p_user or g.claimed_by is not null or g.cancelled_at is not null then
    return jsonb_build_object('ok', false);
  end if;
  update gifts set cancelled_at = now() where id = p_id;
  r := coin_add(p_user, g.coins, 'gift', 'cancel:' || p_id);
  return jsonb_build_object('ok', true, 'balance', (r ->> 'balance')::integer);
end;
$$;

-- ── 맞궁합 초대장 ──
-- Both people's own answers (and what each said about the other), kept 30 days so the other side can answer.
create table if not exists public.pair_invites (
  id text primary key,
  from_user uuid references public.users (id) on delete set null,
  from_name text not null,
  from_person jsonb not null,
  from_self jsonb not null,
  from_obs jsonb not null,
  to_name text not null default '',
  to_person jsonb,
  to_self jsonb,
  to_obs jsonb,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists pair_invites_expires on public.pair_invites (expires_at);
alter table public.pair_invites enable row level security;

-- ── 관리자 ──
-- Balance change by hand (보상, 환불, 회수); never below zero. → { ok, balance }
create or replace function public.coin_adjust(p_user uuid, p_delta integer, p_reason text, p_ref text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  b integer;
begin
  if p_reason not in ('admin', 'refund') or p_delta = 0 then
    raise exception 'coin_adjust: bad reason or delta';
  end if;
  insert into wallets (user_id) values (p_user) on conflict do nothing;
  select balance into b from wallets where user_id = p_user for update;
  if b + p_delta < 0 then
    return jsonb_build_object('ok', false, 'balance', b);
  end if;
  insert into coin_ledger (user_id, delta, reason, ref, balance_after) values (p_user, p_delta, p_reason, p_ref, b + p_delta);
  update wallets set balance = b + p_delta, updated_at = now() where user_id = p_user;
  return jsonb_build_object('ok', true, 'balance', b + p_delta);
end;
$$;

-- One-glance numbers for the 관리자 page (KST days; test payments left out).
create or replace function public.admin_stats()
returns jsonb
language sql
set search_path = public
as $$
  with k as (select (now() at time zone 'Asia/Seoul')::date as today)
  select jsonb_build_object(
    'users', (select count(*) from users where provider <> 'dev'),
    'usersToday', (select count(*) from users, k where provider <> 'dev' and (created_at at time zone 'Asia/Seoul')::date = k.today),
    'users7d', (select count(*) from users where provider <> 'dev' and created_at > now() - interval '7 days'),
    'salesToday', (select coalesce(sum(amount), 0) from payments, k where method = 'toss' and (created_at at time zone 'Asia/Seoul')::date = k.today),
    'sales7d', (select coalesce(sum(amount), 0) from payments where method = 'toss' and created_at > now() - interval '7 days'),
    'sales30d', (select coalesce(sum(amount), 0) from payments where method = 'toss' and created_at > now() - interval '30 days'),
    'salesAll', (select coalesce(sum(amount), 0) from payments where method = 'toss'),
    'paidCount30d', (select count(*) from payments where method = 'toss' and created_at > now() - interval '30 days'),
    'coinsOut', (select coalesce(sum(balance), 0) from wallets),
    'coinsSpent30d', (select coalesce(-sum(delta), 0) from coin_ledger where reason = 'spend' and created_at > now() - interval '30 days'),
    'readings', (select count(*) from readings),
    'pairs', (select count(*) from pair_invites),
    'pairsAnswered', (select count(*) from pair_invites where answered_at is not null),
    'gifts', (select count(*) from gifts),
    'testMode', (select count(*) from payments where method = 'test' and created_at > now() - interval '1 day') > 0
  );
$$;

revoke execute on function public.checkin(uuid, date, integer, integer) from public, anon, authenticated;
revoke execute on function public.gift_send(uuid, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.gift_claim(text, uuid) from public, anon, authenticated;
revoke execute on function public.gift_cancel(text, uuid) from public, anon, authenticated;
revoke execute on function public.coin_adjust(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.checkin(uuid, date, integer, integer) to service_role;
grant execute on function public.gift_send(uuid, text, integer, text, text) to service_role;
grant execute on function public.gift_claim(text, uuid) to service_role;
grant execute on function public.gift_cancel(text, uuid) to service_role;
grant execute on function public.coin_adjust(uuid, integer, text, text) to service_role;
grant execute on function public.admin_stats() to service_role;
