-- 이용 흐름 · 오류 기록 · 환불.
-- Nothing personal is kept here: visits and runs are random ids with a product and how far it got; error rows hold
-- an error message, the page and the browser.

-- ───────────── 이용 흐름 ─────────────

-- One row per browser session (the first page of a visit).
create table if not exists public.visits (
  id text primary key,
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  source text not null default '직접 방문',
  device text not null default 'mobile',
  created_at timestamptz not null default now()
);
create index if not exists visits_day on public.visits (day);

-- One row per interview (or mini game opened): how far it got.
create table if not exists public.runs (
  id text primary key,
  visit_id text,
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  product text not null default 'love',
  status text,
  total_q integer not null default 0,
  max_q integer not null default 0,
  started_at timestamptz not null default now(),
  result_at timestamptz,
  paysheet_at timestamptz,
  paid_at timestamptz
);
create index if not exists runs_day on public.runs (day);

alter table public.visits enable row level security;
alter table public.runs enable row level security;

-- Every step of an interview lands here: it only ever moves a run forward (max_q never goes back, a time once set stays).
create or replace function public.track_run(p_t text, p_run text, p_visit text, p_product text, p_status text, p_n integer, p_total integer)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into runs as r (id, visit_id, product, status, total_q, max_q, result_at, paysheet_at, paid_at)
  values (
    p_run, p_visit, coalesce(p_product, 'love'), p_status, coalesce(p_total, 0), coalesce(p_n, 0),
    case when p_t = 'result' then now() end,
    case when p_t = 'paysheet' then now() end,
    case when p_t = 'paid' then now() end
  )
  on conflict (id) do update set
    visit_id = coalesce(r.visit_id, excluded.visit_id),
    product = coalesce(p_product, r.product),
    status = coalesce(p_status, r.status),
    total_q = case when coalesce(p_total, 0) > 0 then p_total else r.total_q end,
    max_q = greatest(r.max_q, coalesce(p_n, 0)),
    result_at = coalesce(r.result_at, excluded.result_at),
    paysheet_at = coalesce(r.paysheet_at, excluded.paysheet_at),
    paid_at = coalesce(r.paid_at, excluded.paid_at);
end;
$$;

-- The 관리자 이용 흐름 panel: the funnel since a day (KST), for one product (and 궁합 status) or all of them.
create or replace function public.admin_funnel(p_since date, p_product text default null, p_status text default null)
returns jsonb
language sql
set search_path = public
as $$
  with r as (
    select * from runs
    where day >= p_since and product not like 'game:%'
      and (p_product is null or product = p_product)
      and (p_status is null or status = p_status)
  ),
  v as (select * from visits where day >= p_since)
  select jsonb_build_object(
    'visits', (select count(*) from v),
    'started', (select count(*) from r),
    'firstQ', (select count(*) from r where max_q >= 1),
    'half', (select count(*) from r where total_q > 0 and max_q * 2 >= total_q),
    'allQ', (select count(*) from r where total_q > 0 and max_q >= total_q),
    'result', (select count(*) from r where result_at is not null),
    'paysheet', (select count(*) from r where paysheet_at is not null),
    'paid', (select count(*) from r where paid_at is not null),
    'drop', coalesce((select jsonb_object_agg(max_q, n) from (select max_q, count(*) as n from r where result_at is null group by max_q) d), '{}'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('product', product, 'started', s, 'result', res, 'paid', pd) order by s desc)
      from (select product, count(*) as s, count(result_at) as res, count(paid_at) as pd from runs where day >= p_since and product not like 'game:%' group by product) t
    ), '[]'::jsonb),
    'statuses', coalesce((
      select jsonb_agg(jsonb_build_object('status', status, 'started', s, 'result', res, 'paid', pd) order by s desc)
      from (select status, count(*) as s, count(result_at) as res, count(paid_at) as pd from runs where day >= p_since and product = 'couple' and status is not null group by status) t
    ), '[]'::jsonb),
    'games', coalesce((
      select jsonb_agg(jsonb_build_object('product', product, 'started', s) order by s desc)
      from (select product, count(*) as s from runs where day >= p_since and product like 'game:%' group by product) t
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'n', n) order by n desc)
      from (select source, count(*) as n from v group by source order by n desc limit 10) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'n', n) order by n desc)
      from (select device, count(*) as n from v group by device) t
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visits', (select count(*) from visits where day = d::date),
        'started', (select count(*) from runs where day = d::date and product not like 'game:%'),
        'paid', (select count(*) from runs where day = d::date and paid_at is not null)
      ) order by d)
      from generate_series(p_since, (now() at time zone 'Asia/Seoul')::date, interval '1 day') d
    ), '[]'::jsonb)
  );
$$;

-- ───────────── 오류 기록 ─────────────

create table if not exists public.error_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null,
  fingerprint text not null,
  message text not null,
  path text,
  detail text,
  ua text
);
create index if not exists error_logs_time on public.error_logs (created_at desc);
create index if not exists error_logs_fp on public.error_logs (fingerprint, created_at desc);
alter table public.error_logs enable row level security;

-- Keeps an error; true when this kind hasn't been seen in the last day (the 관리자 then gets a mail). A kind that
-- floods (50 in 10 minutes) stops being stored until it calms down; rows older than 30 days go.
create or replace function public.log_error(p_source text, p_fp text, p_message text, p_path text, p_detail text, p_ua text)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  fresh boolean;
begin
  if (select count(*) from error_logs where fingerprint = p_fp and created_at > now() - interval '10 minutes') >= 50 then
    return false;
  end if;
  select not exists (select 1 from error_logs where fingerprint = p_fp and created_at > now() - interval '24 hours') into fresh;
  insert into error_logs (source, fingerprint, message, path, detail, ua)
  values (left(p_source, 20), left(p_fp, 200), left(p_message, 500), left(p_path, 300), left(p_detail, 2000), left(p_ua, 300));
  if random() < 0.05 then
    delete from error_logs where created_at < now() - interval '30 days';
  end if;
  return fresh;
end;
$$;

-- The 관리자 오류 panel: errors since a time, one row per kind, newest first.
create or replace function public.admin_errors(p_since timestamptz)
returns jsonb
language sql
set search_path = public
as $$
  select coalesce(jsonb_agg(x order by x->>'last' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'fingerprint', fingerprint,
      'source', (array_agg(source order by created_at desc))[1],
      'message', (array_agg(message order by created_at desc))[1],
      'path', (array_agg(path order by created_at desc))[1],
      'detail', (array_agg(detail order by created_at desc))[1],
      'ua', (array_agg(ua order by created_at desc))[1],
      'count', count(*),
      'first', min(created_at),
      'last', max(created_at)
    ) as x
    from error_logs
    where created_at >= p_since
    group by fingerprint
    order by max(created_at) desc
    limit 60
  ) t;
$$;

-- ───────────── 환불 ─────────────

alter table public.payments add column if not exists payment_key text;
alter table public.payments add column if not exists refunded_at timestamptz;
alter table public.payments add column if not exists refund_amount integer;
alter table public.payments add column if not exists refund_coins integer;
alter table public.payments add column if not exists refund_note text;

-- Sales net of refunds; refunds have their own number.
create or replace function public.admin_stats()
returns jsonb
language sql
set search_path = public
as $$
  with k as (select (now() at time zone 'Asia/Seoul')::date as today),
  p as (select created_at, amount - coalesce(refund_amount, 0) as net from payments where method = 'toss')
  select jsonb_build_object(
    'users', (select count(*) from users where provider <> 'dev'),
    'usersToday', (select count(*) from users, k where provider <> 'dev' and (created_at at time zone 'Asia/Seoul')::date = k.today),
    'users7d', (select count(*) from users where provider <> 'dev' and created_at > now() - interval '7 days'),
    'salesToday', (select coalesce(sum(net), 0) from p, k where (created_at at time zone 'Asia/Seoul')::date = k.today),
    'sales7d', (select coalesce(sum(net), 0) from p where created_at > now() - interval '7 days'),
    'sales30d', (select coalesce(sum(net), 0) from p where created_at > now() - interval '30 days'),
    'salesAll', (select coalesce(sum(net), 0) from p),
    'paidCount30d', (select count(*) from payments where method = 'toss' and created_at > now() - interval '30 days'),
    'refunds30d', (select coalesce(sum(refund_amount), 0) from payments where method = 'toss' and refunded_at > now() - interval '30 days'),
    'coinsOut', (select coalesce(sum(balance), 0) from wallets),
    'coinsSpent30d', (select coalesce(-sum(delta), 0) from coin_ledger where reason = 'spend' and created_at > now() - interval '30 days'),
    'readings', (select count(*) from readings),
    'pairs', (select count(*) from pair_invites),
    'pairsAnswered', (select count(*) from pair_invites where answered_at is not null),
    'gifts', (select count(*) from gifts),
    'errors24h', (select count(*) from error_logs where created_at > now() - interval '24 hours'),
    'testMode', (select count(*) from payments where method = 'test' and created_at > now() - interval '1 day') > 0
  );
$$;

revoke execute on function public.track_run(text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.admin_funnel(date, text, text) from public, anon, authenticated;
revoke execute on function public.log_error(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.admin_errors(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.track_run(text, text, text, text, text, integer, integer) to service_role;
grant execute on function public.admin_funnel(date, text, text) to service_role;
grant execute on function public.log_error(text, text, text, text, text, text) to service_role;
grant execute on function public.admin_errors(timestamptz) to service_role;
grant execute on function public.admin_stats() to service_role;
