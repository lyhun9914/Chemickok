-- 회원 · 결제 기록 · 내 점괘함. RLS is on with no policies: only the server (secret key) can read or write.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('kakao', 'naver', 'google', 'dev')),
  provider_id text not null,
  nickname text not null default '',
  email text,
  -- 기본 정보 { name, gender, birthdate, birthtime, mbti }
  profile jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  unique (provider, provider_id)
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  mode text not null,
  title text not null,
  -- display names only ({ me, partner }); birth data of the other person is not kept
  names jsonb not null default '{}'::jsonb,
  teaser jsonb not null,
  report jsonb not null,
  order_id text,
  created_at timestamptz not null default now()
);
create index if not exists readings_user_created on public.readings (user_id, created_at desc);

-- 전자상거래법: 대금결제 기록은 5년 보관. Kept after 회원 탈퇴 with the user link removed.
create table if not exists public.payments (
  order_id text primary key,
  user_id uuid references public.users (id) on delete set null,
  input_hash text not null,
  amount integer not null,
  method text not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_user on public.payments (user_id);

alter table public.users enable row level security;
alter table public.readings enable row level security;
alter table public.payments enable row level security;
