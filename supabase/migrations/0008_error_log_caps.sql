-- 오류 기록이 넘치지 않게: /api/log is open to any browser, so a burst of made-up errors must not fill the table or
-- the 관리자 inbox. Over 300 rows in 10 minutes nothing more is stored, and only the first 20 new kinds in a day mail
-- the 관리자 (the rest still show in the 관리자 page).
create or replace function public.log_error(p_source text, p_fp text, p_message text, p_path text, p_detail text, p_ua text)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  fresh boolean;
begin
  if (select count(*) from error_logs where created_at > now() - interval '10 minutes') >= 300 then
    return false;
  end if;
  if (select count(*) from error_logs where fingerprint = p_fp and created_at > now() - interval '10 minutes') >= 50 then
    return false;
  end if;
  select not exists (select 1 from error_logs where fingerprint = p_fp and created_at > now() - interval '24 hours') into fresh;
  if fresh and (select count(distinct fingerprint) from error_logs where created_at > now() - interval '24 hours') >= 20 then
    fresh := false;
  end if;
  insert into error_logs (source, fingerprint, message, path, detail, ua)
  values (left(p_source, 20), left(p_fp, 200), left(p_message, 500), left(p_path, 300), left(p_detail, 2000), left(p_ua, 300));
  if random() < 0.05 then
    delete from error_logs where created_at < now() - interval '30 days';
  end if;
  return fresh;
end;
$$;
