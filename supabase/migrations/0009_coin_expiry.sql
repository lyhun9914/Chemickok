-- 충전한 냥의 유효기간 (약관 제4조 ②): 충전일부터 1년이 지나면 남은 충전 냥이 사라진다.
-- The server works out which 충전 is due (src/lib/coinLots.ts) and calls coin_expire once per 충전.

alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check
  check (reason in ('charge', 'spend', 'bonus', 'refund', 'admin', 'gift', 'expire'));

-- the daily job looks up old 충전 by reason and time
create index if not exists coin_ledger_reason_created on public.coin_ledger (reason, created_at);

-- Takes up to p_coins away as 'expire', once per ref ("expire:<orderId>"), never below zero. → { applied, taken, balance }
create or replace function public.coin_expire(p_user uuid, p_coins integer, p_ref text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  b integer;
  k integer;
begin
  if p_coins <= 0 then
    raise exception 'coin_expire: coins must be positive';
  end if;
  select balance into b from wallets where user_id = p_user for update;
  if b is null then
    return jsonb_build_object('applied', false, 'taken', 0, 'balance', 0);
  end if;
  if exists (select 1 from coin_ledger where user_id = p_user and reason = 'expire' and ref = p_ref) then
    return jsonb_build_object('applied', false, 'taken', 0, 'balance', b);
  end if;
  k := least(p_coins, b);
  if k <= 0 then
    return jsonb_build_object('applied', false, 'taken', 0, 'balance', b);
  end if;
  insert into coin_ledger (user_id, delta, reason, ref, balance_after) values (p_user, -k, 'expire', p_ref, b - k);
  update wallets set balance = b - k, updated_at = now() where user_id = p_user;
  return jsonb_build_object('applied', true, 'taken', k, 'balance', b - k);
end;
$$;

revoke execute on function public.coin_expire(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.coin_expire(uuid, integer, text) to service_role;

-- covering indexes for foreign keys (Supabase performance advisor)
create index if not exists coupon_redemptions_user on public.coupon_redemptions (user_id);
create index if not exists gifts_claimed_by on public.gifts (claimed_by);
create index if not exists pair_invites_from_user on public.pair_invites (from_user);
create index if not exists users_referred_by on public.users (referred_by);
