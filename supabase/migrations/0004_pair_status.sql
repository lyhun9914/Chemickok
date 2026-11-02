-- 맞궁합 초대장: the relationship status the sender chose, so the invited person answers the same question set.
alter table public.pair_invites add column if not exists status text not null default 'dating';
alter table public.pair_invites drop constraint if exists pair_invites_status_check;
alter table public.pair_invites add constraint pair_invites_status_check check (status in ('crush', 'dating', 'slump', 'breakup'));
