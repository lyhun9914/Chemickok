-- 재미 기능: 단톡방 케미표 · 나를 얼마나 아냥? 퀴즈 · 고양이 도감 모으기
-- 케미표와 퀴즈는 만든 날부터 30일 보관 (만료된 것은 새로 만들 때 · 매일 아침 지운다). 도감은 회원 탈퇴 때 같이 지운다.

-- ── 단톡방 케미표 ──
create table if not exists public.chem_rooms (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists chem_rooms_expires on public.chem_rooms (expires_at);
create table if not exists public.chem_members (
  id bigserial primary key,
  room_id text not null references public.chem_rooms (id) on delete cascade,
  name text not null,
  birthdate text not null,
  member_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists chem_members_room on public.chem_members (room_id);
alter table public.chem_rooms enable row level security;
alter table public.chem_members enable row level security;

-- Joins a live room: names unique (case aside), at most p_max people. → { ok, reason? }
create or replace function public.chem_join(p_room text, p_name text, p_birth text, p_key text, p_max integer)
returns jsonb
language plpgsql
set search_path = public
as $$
begin
  perform 1 from chem_rooms where id = p_room and expires_at > now() for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'none');
  end if;
  if exists (select 1 from chem_members where room_id = p_room and lower(name) = lower(p_name)) then
    return jsonb_build_object('ok', false, 'reason', 'name');
  end if;
  if (select count(*) from chem_members where room_id = p_room) >= p_max then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;
  insert into chem_members (room_id, name, birthdate, member_key) values (p_room, p_name, p_birth, p_key);
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 나를 얼마나 아냥? 퀴즈 ──
create table if not exists public.quizzes (
  id text primary key,
  owner_name text not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists quizzes_expires on public.quizzes (expires_at);
create table if not exists public.quiz_plays (
  id bigserial primary key,
  quiz_id text not null references public.quizzes (id) on delete cascade,
  name text not null,
  score integer not null,
  mask integer not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_plays_quiz on public.quiz_plays (quiz_id, score desc);
alter table public.quizzes enable row level security;
alter table public.quiz_plays enable row level security;

-- One try per name on a live quiz, at most p_max tries. → { ok, reason? }
create or replace function public.quiz_play(p_quiz text, p_name text, p_score integer, p_mask integer, p_max integer)
returns jsonb
language plpgsql
set search_path = public
as $$
begin
  perform 1 from quizzes where id = p_quiz and expires_at > now() for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'none');
  end if;
  if exists (select 1 from quiz_plays where quiz_id = p_quiz and lower(name) = lower(p_name)) then
    return jsonb_build_object('ok', false, 'reason', 'name');
  end if;
  if (select count(*) from quiz_plays where quiz_id = p_quiz) >= p_max then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;
  insert into quiz_plays (quiz_id, name, score, mask) values (p_quiz, p_name, p_score, p_mask);
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 고양이 도감 모으기 ──
create table if not exists public.cat_cards (
  user_id uuid not null references public.users (id) on delete cascade,
  no smallint not null check (no between 1 and 60),
  got_day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, no),
  unique (user_id, got_day)
);
alter table public.cat_cards enable row level security;

-- One card a day (KST day from the server). → { ok, no }: ok=false with today's card when it was already drawn
create or replace function public.cat_draw(p_user uuid, p_day date, p_no integer)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  select no into n from cat_cards where user_id = p_user and got_day = p_day;
  if found then
    return jsonb_build_object('ok', false, 'no', n);
  end if;
  insert into cat_cards (user_id, no, got_day) values (p_user, p_no, p_day) on conflict do nothing;
  if not found then
    select no into n from cat_cards where user_id = p_user and got_day = p_day;
    return jsonb_build_object('ok', false, 'no', coalesce(n, 0));
  end if;
  return jsonb_build_object('ok', true, 'no', p_no);
end;
$$;

revoke execute on function public.chem_join(text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.quiz_play(text, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.cat_draw(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.chem_join(text, text, text, text, integer) to service_role;
grant execute on function public.quiz_play(text, text, integer, integer, integer) to service_role;
grant execute on function public.cat_draw(uuid, date, integer) to service_role;
