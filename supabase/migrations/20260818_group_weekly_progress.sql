alter table public.group_profiles
  add column if not exists weekly_goal_percent smallint not null default 0
  check (weekly_goal_percent between 0 and 100);

create or replace function public.update_group_weekly_goal_progress(p_percent integer)
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized smallint := greatest(0, least(100, p_percent))::smallint;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.group_profiles
    set weekly_goal_percent = normalized, updated_at = now()
    where user_id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  return normalized;
end;
$$;

revoke execute on function public.update_group_weekly_goal_progress(integer) from public, anon;
grant execute on function public.update_group_weekly_goal_progress(integer) to authenticated;
