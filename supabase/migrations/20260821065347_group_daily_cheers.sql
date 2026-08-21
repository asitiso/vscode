create table public.group_daily_cheers (
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  cheer_date date not null,
  cheer_type text not null check (cheer_type in ('fire','clap','together')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, sender_id, receiver_id, cheer_date),
  check (sender_id <> receiver_id)
);

create index group_daily_cheers_receiver_day_idx
  on public.group_daily_cheers(group_id, receiver_id, cheer_date);

alter table public.group_daily_cheers enable row level security;

revoke all on public.group_daily_cheers from public, anon, authenticated;

create or replace function public.get_group_daily_cheer_summary(
  p_group_id uuid,
  p_receiver_id uuid
)
returns table(
  fire_count integer,
  clap_count integer,
  together_count integer,
  my_selection text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_kst date := timezone('Asia/Seoul', now())::date;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_group_member(p_group_id, uid) then raise exception 'NOT_GROUP_MEMBER'; end if;
  if not public.is_group_member(p_group_id, p_receiver_id) then raise exception 'NOT_GROUP_MEMBER'; end if;

  return query
  select
    count(*) filter (where c.cheer_type = 'fire')::integer,
    count(*) filter (where c.cheer_type = 'clap')::integer,
    count(*) filter (where c.cheer_type = 'together')::integer,
    max(c.cheer_type) filter (where c.sender_id = uid)
  from public.group_daily_cheers c
  where c.group_id = p_group_id
    and c.receiver_id = p_receiver_id
    and c.cheer_date = today_kst;
end;
$$;

create or replace function public.send_group_daily_cheer(
  p_group_id uuid,
  p_receiver_id uuid,
  p_cheer_type text
)
returns table(
  fire_count integer,
  clap_count integer,
  together_count integer,
  my_selection text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_kst date := timezone('Asia/Seoul', now())::date;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_cheer_type not in ('fire','clap','together') then raise exception 'INVALID_CHEER_TYPE'; end if;
  if uid = p_receiver_id then raise exception 'SELF_CHEER_NOT_ALLOWED'; end if;
  if not public.is_group_member(p_group_id, uid) then raise exception 'NOT_GROUP_MEMBER'; end if;
  if not public.is_group_member(p_group_id, p_receiver_id) then raise exception 'NOT_GROUP_MEMBER'; end if;

  insert into public.group_daily_cheers(
    group_id, sender_id, receiver_id, cheer_date, cheer_type
  ) values (
    p_group_id, uid, p_receiver_id, today_kst, p_cheer_type
  )
  on conflict (group_id, sender_id, receiver_id, cheer_date)
  do update set cheer_type = excluded.cheer_type, updated_at = now();

  return query
  select * from public.get_group_daily_cheer_summary(p_group_id, p_receiver_id);
end;
$$;

revoke execute on function public.get_group_daily_cheer_summary(uuid, uuid) from public, anon;
revoke execute on function public.send_group_daily_cheer(uuid, uuid, text) from public, anon;
grant execute on function public.get_group_daily_cheer_summary(uuid, uuid) to authenticated;
grant execute on function public.send_group_daily_cheer(uuid, uuid, text) to authenticated;
