-- 탈퇴한 소셜 계정: a re-join of the same Kakao/Naver/Google account doesn't get the 가입 선물 again.
-- Only an HMAC of "provider:provider_id" is kept (not reversible without the server secret), for one year.
create table if not exists public.withdrawn_accounts (
  key text primary key,
  withdrawn_at timestamptz not null default now()
);
alter table public.withdrawn_accounts enable row level security;
