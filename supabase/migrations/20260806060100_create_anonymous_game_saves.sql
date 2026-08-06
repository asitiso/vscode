create table if not exists public.anonymous_game_saves (
  device_key_hash text primary key
    check (device_key_hash ~ '^[0-9a-f]{64}$'),
  state jsonb not null,
  client_saved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  schema_version integer not null default 1
    check (schema_version between 1 and 1000)
);

alter table public.anonymous_game_saves enable row level security;
revoke all on table public.anonymous_game_saves from anon, authenticated;

create or replace function public.save_anonymous_game_state(
  p_device_key_hash text,
  p_state jsonb,
  p_client_saved_at timestamptz,
  p_schema_version integer default 1
)
returns table (
  client_saved_at timestamptz,
  updated_at timestamptz,
  schema_version integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_device_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid device key hash';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'state must be a JSON object';
  end if;
  if p_schema_version < 1 or p_schema_version > 1000 then
    raise exception 'invalid schema version';
  end if;

  return query
  insert into public.anonymous_game_saves as saves (
    device_key_hash,
    state,
    client_saved_at,
    updated_at,
    schema_version
  ) values (
    p_device_key_hash,
    p_state,
    p_client_saved_at,
    now(),
    p_schema_version
  )
  on conflict (device_key_hash) do update set
    state = excluded.state,
    client_saved_at = excluded.client_saved_at,
    updated_at = now(),
    schema_version = excluded.schema_version
  returning saves.client_saved_at, saves.updated_at, saves.schema_version;
end;
$$;

create or replace function public.load_anonymous_game_state(
  p_device_key_hash text
)
returns table (
  state jsonb,
  client_saved_at timestamptz,
  updated_at timestamptz,
  schema_version integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_device_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid device key hash';
  end if;

  return query
  select saves.state, saves.client_saved_at, saves.updated_at, saves.schema_version
  from public.anonymous_game_saves as saves
  where saves.device_key_hash = p_device_key_hash;
end;
$$;

revoke all on function public.save_anonymous_game_state(text, jsonb, timestamptz, integer) from public;
revoke all on function public.load_anonymous_game_state(text) from public;
grant execute on function public.save_anonymous_game_state(text, jsonb, timestamptz, integer) to anon, authenticated;
grant execute on function public.load_anonymous_game_state(text) to anon, authenticated;
