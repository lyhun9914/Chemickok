-- 공유 단추 누름 · 방문 utm_medium / utm_campaign. 추가만 한다(기존 표·함수는 그대로).
-- Nothing personal: a share row is the page it came from, the reading mode and the channel (카톡 · 스토리 · QR · 복사).

alter table public.visits add column if not exists medium text;
alter table public.visits add column if not exists campaign text;

create table if not exists public.shares (
  id bigserial primary key,
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  visit_id text,
  -- result: 결과 화면 · handoff: 이어 보기(QR·점괘함) · game: 미니게임 · invite: 친구 초대
  surface text not null,
  mode text,
  -- kakao · story · qr · copy
  channel text not null,
  created_at timestamptz not null default now()
);
create index if not exists shares_day on public.shares (day);
alter table public.shares enable row level security;

-- The 관리자 이용 흐름 panel, 공유 · 캠페인 part: shares by page × channel, and visits by utm source × medium × campaign.
create or replace function public.admin_viral(p_since date)
returns jsonb
language sql
set search_path = public
as $$
  select jsonb_build_object(
    'shares', (select count(*) from shares where day >= p_since),
    'shareBy', coalesce((
      select jsonb_agg(jsonb_build_object('surface', surface, 'channel', channel, 'n', n) order by n desc)
      from (select surface, channel, count(*) as n from shares where day >= p_since group by surface, channel order by n desc limit 20) t
    ), '[]'::jsonb),
    'shareModes', coalesce((
      select jsonb_agg(jsonb_build_object('mode', mode, 'n', n) order by n desc)
      from (select mode, count(*) as n from shares where day >= p_since and mode is not null group by mode order by n desc limit 20) t
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'medium', medium, 'campaign', campaign, 'n', n) order by n desc)
      from (
        select source, medium, campaign, count(*) as n from visits
        where day >= p_since and (medium is not null or campaign is not null)
        group by source, medium, campaign order by n desc limit 20
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.admin_viral(date) from public, anon, authenticated;
grant execute on function public.admin_viral(date) to service_role;
