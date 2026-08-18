-- Group social workout subsystem.
-- Keeps anonymous_game_saves and the existing game state independent from account-backed groups.

create table if not exists public.group_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 30),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code char(6) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists workout_sessions_one_active_per_user
  on public.workout_sessions(user_id)
  where ended_at is null;

create table if not exists public.group_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  workout_seconds integer not null default 0 check (workout_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

create or replace function public.shares_group_with(p_other_user_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = p_user_id and theirs.user_id = p_other_user_id
  );
$$;

create or replace function public.generate_group_invite_code()
returns char(6)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where g.invite_code = candidate);
  end loop;
  return candidate::char(6);
end;
$$;

create or replace function public.upsert_group_profile(p_nickname text)
returns public.group_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := btrim(p_nickname);
  result public.group_profiles;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(normalized) not between 2 and 20 then raise exception 'INVALID_NICKNAME'; end if;

  insert into public.group_profiles(user_id, nickname)
  values (uid, normalized)
  on conflict (user_id) do update
    set nickname = excluded.nickname, updated_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.create_group(p_name text)
returns table(group_id uuid, invite_code char(6))
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := btrim(p_name);
  gid uuid;
  code char(6);
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(normalized) not between 2 and 30 then raise exception 'INVALID_GROUP_NAME'; end if;
  if (select count(*) from public.group_members where user_id = uid) >= 5 then
    raise exception 'GROUP_LIMIT_REACHED';
  end if;

  code := public.generate_group_invite_code();
  insert into public.groups(name, owner_id, invite_code)
  values (normalized, uid, code)
  returning id into gid;
  insert into public.group_members(group_id, user_id) values (gid, uid);

  return query select gid, code;
end;
$$;

create or replace function public.join_group_by_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(btrim(p_code));
  gid uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(normalized) <> 6 then raise exception 'INVALID_INVITE_CODE'; end if;

  select g.id into gid from public.groups g where g.invite_code = normalized;
  if gid is null then raise exception 'INVALID_INVITE_CODE'; end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then return gid; end if;
  if (select count(*) from public.group_members where user_id = uid) >= 5 then raise exception 'GROUP_LIMIT_REACHED'; end if;
  if (select count(*) from public.group_members where group_id = gid) >= 20 then raise exception 'GROUP_FULL'; end if;

  insert into public.group_members(group_id, user_id) values (gid, uid);
  return gid;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner_uid uuid;
  member_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select owner_id into owner_uid from public.groups where id = p_group_id;
  if owner_uid is null or not public.is_group_member(p_group_id, uid) then raise exception 'NOT_GROUP_MEMBER'; end if;

  if owner_uid = uid then
    select count(*) into member_count from public.group_members where group_id = p_group_id;
    if member_count > 1 then raise exception 'OWNER_CANNOT_LEAVE'; end if;
    delete from public.groups where id = p_group_id;
  else
    delete from public.group_members where group_id = p_group_id and user_id = uid;
  end if;
end;
$$;

create or replace function public.remove_group_member(p_group_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner_uid uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select owner_id into owner_uid from public.groups where id = p_group_id;
  if owner_uid <> uid then raise exception 'OWNER_REQUIRED'; end if;
  if p_member_id = uid then raise exception 'OWNER_CANNOT_REMOVE_SELF'; end if;
  delete from public.group_members where group_id = p_group_id and user_id = p_member_id;
end;
$$;

create or replace function public.start_workout_session()
returns public.workout_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.workout_sessions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.workout_sessions
    where user_id = uid and ended_at is null order by started_at desc limit 1;
  if result.id is not null then
    update public.workout_sessions set last_heartbeat_at = now() where id = result.id returning * into result;
    return result;
  end if;
  insert into public.workout_sessions(user_id) values (uid) returning * into result;
  return result;
end;
$$;

create or replace function public.heartbeat_workout_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  touched integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.workout_sessions
    set last_heartbeat_at = now()
    where id = p_session_id and user_id = uid and ended_at is null;
  get diagnostics touched = row_count;
  return touched = 1;
end;
$$;

create or replace function public.end_workout_session(p_session_id uuid, p_activity_date date default current_date)
returns public.workout_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.workout_sessions;
  seconds integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.workout_sessions
    set ended_at = now(),
        last_heartbeat_at = now(),
        duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::integer)
    where id = p_session_id and user_id = uid and ended_at is null
    returning * into result;

  if result.id is null then
    select * into result from public.workout_sessions where id = p_session_id and user_id = uid;
    if result.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
    return result;
  end if;

  seconds := coalesce(result.duration_seconds, 0);
  insert into public.group_activity_daily(user_id, activity_date, workout_seconds)
  values (uid, p_activity_date, seconds)
  on conflict (user_id, activity_date) do update
    set workout_seconds = public.group_activity_daily.workout_seconds + excluded.workout_seconds,
        updated_at = now();
  return result;
end;
$$;

alter table public.group_profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.group_activity_daily enable row level security;

create policy group_profiles_select_shared on public.group_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.shares_group_with(user_id));
create policy group_profiles_insert_self on public.group_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy group_profiles_update_self on public.group_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy groups_select_members on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy group_members_select_shared on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

create policy workout_sessions_select_shared on public.workout_sessions
  for select to authenticated using (user_id = auth.uid() or public.shares_group_with(user_id));

create policy group_activity_select_shared on public.group_activity_daily
  for select to authenticated using (user_id = auth.uid() or public.shares_group_with(user_id));

revoke insert, update, delete on public.groups from authenticated;
revoke insert, update, delete on public.group_members from authenticated;
revoke insert, update, delete on public.workout_sessions from authenticated;
revoke insert, update, delete on public.group_activity_daily from authenticated;

grant select on public.group_profiles, public.groups, public.group_members, public.workout_sessions, public.group_activity_daily to authenticated;
grant insert, update on public.group_profiles to authenticated;

grant execute on function public.upsert_group_profile(text) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.start_workout_session() to authenticated;
grant execute on function public.heartbeat_workout_session(uuid) to authenticated;
grant execute on function public.end_workout_session(uuid, date) to authenticated;
