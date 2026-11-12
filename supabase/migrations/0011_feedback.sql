-- 냥신 건의함 · 점괘 평가: 회원이 보낸 의견(건의)과 유료 점괘 결과 평가를 한 표에 모은다.
-- 관리자는 상태 · 메모 · 답장을 남기고, 채택하면 냥을 선물한다(app_settings 'feedback'.adoptReward, 기본 1냥).
-- 회원 탈퇴 때 함께 지운다.

create table if not exists public.feedback (
  id bigserial primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  -- rating: 점괘 결과 평가 / idea: 이런 거 생겼으면 / sad: 아쉬웠던 점 / bug: 오류 / praise: 칭찬
  kind text not null check (kind in ('rating', 'idea', 'sad', 'bug', 'praise')),
  rating text check (rating in ('great', 'ok', 'meh')),
  tags text[] not null default '{}',
  body text not null default '',
  -- the product it was about (rating; a 건의 sent from a result)
  mode text,
  -- rating: which reading ("r:<reading id>" or "h:<input hash>"), one rating per reading
  ref text,
  -- where it was sent from and on what (helps with 오류)
  page text,
  device text,
  status text not null default 'new' check (status in ('new', 'seen', 'planned', 'done', 'closed')),
  -- 관리자 메모 (only the 관리자 sees it)
  memo text not null default '',
  -- 냥신의 답장 (the member sees it in 내 점괘함)
  reply text not null default '',
  -- 채택: when, and the 냥 given
  adopted_at timestamptz,
  reward integer not null default 0,
  -- a change the member hasn't seen yet (답장 · 반영 · 채택) → red dot on 내 점괘함
  unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_rating_value check ((kind = 'rating') = (rating is not null))
);
-- ref is null for 건의 (nulls never collide), so this keeps one rating per reading without a partial index
create unique index if not exists feedback_rating_once on public.feedback (user_id, ref);
create index if not exists feedback_created on public.feedback (created_at desc);
create index if not exists feedback_user on public.feedback (user_id, created_at desc);
create index if not exists feedback_unread on public.feedback (user_id) where unread;
alter table public.feedback enable row level security;
