create table if not exists public.user_game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  schema_version integer not null default 1 check (schema_version between 1 and 1000),
  revision bigint not null default 1 check (revision >= 1),
  client_saved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_game_saves enable row level security;
revoke all on table public.user_game_saves from anon, authenticated;
grant select on table public.user_game_saves to authenticated;

create policy "user_game_saves_select_own"
on public.user_game_saves
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.load_user_game_state()
returns table (
  state jsonb,
  schema_version integer,
  revision bigint,
  client_saved_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select saves.state, saves.schema_version, saves.revision, saves.client_saved_at, saves.updated_at
  from public.user_game_saves as saves
  where saves.user_id = auth.uid();
$$;

create or replace function public.save_user_game_state(
  p_state jsonb,
  p_client_saved_at timestamptz,
  p_schema_version integer,
  p_expected_revision bigint default null
)
returns table (
  status text,
  revision bigint,
  client_saved_at timestamptz,
  updated_at timestamptz,
  schema_version integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision bigint;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'state must be a JSON object';
  end if;
  if p_schema_version < 1 or p_schema_version > 1000 then
    raise exception 'invalid schema version';
  end if;

  select saves.revision
  into v_revision
  from public.user_game_saves as saves
  where saves.user_id = v_user_id
  for update;

  if not found then
    if p_expected_revision is not null then
      return query select 'conflict'::text, null::bigint, null::timestamptz, null::timestamptz, null::integer;
      return;
    end if;

    return query
    insert into public.user_game_saves as saves (
      user_id, state, schema_version, revision, client_saved_at, created_at, updated_at
    ) values (
      v_user_id, p_state, p_schema_version, 1, p_client_saved_at, now(), now()
    )
    returning 'saved'::text, saves.revision, saves.client_saved_at, saves.updated_at, saves.schema_version;
    return;
  end if;

  if p_expected_revision is distinct from v_revision then
    return query
    select 'conflict'::text, saves.revision, saves.client_saved_at, saves.updated_at, saves.schema_version
    from public.user_game_saves as saves
    where saves.user_id = v_user_id;
    return;
  end if;

  return query
  update public.user_game_saves as saves
  set state = p_state,
      schema_version = p_schema_version,
      revision = saves.revision + 1,
      client_saved_at = p_client_saved_at,
      updated_at = now()
  where saves.user_id = v_user_id
  returning 'saved'::text, saves.revision, saves.client_saved_at, saves.updated_at, saves.schema_version;
end;
$$;

revoke all on function public.load_user_game_state() from public, anon;
revoke all on function public.save_user_game_state(jsonb, timestamptz, integer, bigint) from public, anon;
grant execute on function public.load_user_game_state() to authenticated;
grant execute on function public.save_user_game_state(jsonb, timestamptz, integer, bigint) to authenticated;
