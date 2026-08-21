# Daily Anonymous Group Cheers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real server-backed, daily anonymous cheers between members of the same workout group, with Korea-local day boundaries and no sender identity exposure.

**Architecture:** Store exactly one current-day cheer row per `(group_id, sender_id, receiver_id, cheer_date)` in Supabase. Keep the raw table private from normal browser access and expose only two narrow authenticated RPCs: one summary read and one send/upsert that returns the updated anonymous summary in the same round trip. The React member-detail modal owns only transient cheer UI state; no global store, Realtime subscription, reward integration, or long-lived client history is added.

**Tech Stack:** PostgreSQL 17 / Supabase Auth + RLS + PostgREST RPC, React 19, TypeScript, Vitest, Testing Library, Vite, oxlint.

**Spec:** `docs/superpowers/specs/2026-08-21-group-daily-cheers-design.md`

## Global Constraints

- Cheer types are exactly `fire`, `clap`, and `together`.
- Current day is computed on the database server with `timezone('Asia/Seoul', now())::date`; the client never supplies a date.
- One sender may have at most one cheer row per receiver/group/day; choosing another type updates that row.
- Self-cheering is forbidden.
- Both sender and receiver must currently belong to the specified group.
- Raw sender-bearing rows must not be readable or writable by normal browser roles.
- The receiver sees aggregate counts only; the caller may additionally see only their own selection for that receiver.
- Cheers never affect cooperative quests, MVP, weekly awards, saves, XP, rewards, or workout calculations.
- No push notifications, Realtime, sender history, free-form text, cancel action, or weekly/all-time cheer UI in V1.
- Existing repository lockfile mismatch remains out of scope; CI may continue using `npm install --no-package-lock --no-audit --no-fund`.

---

### Task 1: Supabase daily-cheer persistence and RPC contract

**Files:**
- Create after successful DB migration version is known: `supabase/migrations/<version>_group_daily_cheers.sql`
- Read: `supabase/migrations/20260818_group_social_workout.sql`
- Read: `supabase/migrations/20260818_group_social_workout_hardening.sql`
- Read: `supabase/migrations/20260818_group_rls_helper_permissions.sql`

**Interfaces:**
- Produces table: `public.group_daily_cheers`
- Produces RPC: `public.get_group_daily_cheer_summary(p_group_id uuid, p_receiver_id uuid)`
- Produces RPC: `public.send_group_daily_cheer(p_group_id uuid, p_receiver_id uuid, p_cheer_type text)`
- Both RPCs return a single row with `fire_count integer`, `clap_count integer`, `together_count integer`, `my_selection text`.

- [ ] **Step 1: Verify RED state on the connected Supabase project**

Run:

```sql
select to_regclass('public.group_daily_cheers') as table_name,
       to_regprocedure('public.send_group_daily_cheer(uuid,uuid,text)') as send_rpc,
       to_regprocedure('public.get_group_daily_cheer_summary(uuid,uuid)') as summary_rpc;
```

Expected before implementation: all three values are `null`.

- [ ] **Step 2: Apply the additive migration**

Use the connected Supabase migration action with migration name `group_daily_cheers` and this SQL contract:

```sql
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
```

- [ ] **Step 3: Verify object existence and privilege posture**

Run:

```sql
select to_regclass('public.group_daily_cheers') as table_name,
       to_regprocedure('public.send_group_daily_cheer(uuid,uuid,text)') as send_rpc,
       to_regprocedure('public.get_group_daily_cheer_summary(uuid,uuid)') as summary_rpc;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'group_daily_cheers'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;
```

Expected: all three objects exist; no raw-table privileges are returned for `anon` or `authenticated`.

- [ ] **Step 4: Verify RLS and function execution grants**

Run:

```sql
select relrowsecurity
from pg_class
where oid = 'public.group_daily_cheers'::regclass;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('get_group_daily_cheer_summary','send_group_daily_cheer')
  and grantee in ('PUBLIC','anon','authenticated')
order by routine_name, grantee;
```

Expected: `relrowsecurity = true`; `authenticated` has EXECUTE; `PUBLIC` and `anon` do not.

- [ ] **Step 5: Run Supabase advisors**

Run security and performance advisors on the connected project. Any new warning attributable to `group_daily_cheers` or either RPC is a blocker and must be fixed before continuing.

- [ ] **Step 6: Record the migration in the repository**

After `list_migrations` reveals the exact generated migration version for `group_daily_cheers`, create `supabase/migrations/<exact-version>_group_daily_cheers.sql` with the exact SQL applied above, then commit only that migration file.

---

### Task 2: Typed cheer API contract

**Files:**
- Modify: `src/group/groupTypes.ts`
- Modify: `src/group/groupApi.ts`
- Create: `src/group/groupCheerApi.test.ts`

**Interfaces:**
- Produces: `export type GroupCheerType = 'fire' | 'clap' | 'together'`
- Produces: `export interface GroupCheerSummary { fire: number; clap: number; together: number; mySelection: GroupCheerType | null }`
- Produces: `loadGroupDailyCheerSummary(groupId: string, receiverId: string): Promise<GroupCheerSummary>`
- Produces: `sendGroupDailyCheer(groupId: string, receiverId: string, type: GroupCheerType): Promise<GroupCheerSummary>`

- [ ] **Step 1: Write failing API mapping tests**

Create focused Vitest coverage that stubs the Supabase client/RPC boundary and proves:

```ts
expect(await loadGroupDailyCheerSummary('g1', 'u2')).toEqual({
  fire: 2,
  clap: 1,
  together: 3,
  mySelection: 'clap',
});
```

Also verify numeric strings/nulls normalize to non-negative integers and invalid/non-cheer `my_selection` values normalize to `null`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/group/groupCheerApi.test.ts
```

Expected: FAIL because the cheer types/helpers do not exist yet.

- [ ] **Step 3: Add the minimal types and mapping helper**

Add to `groupTypes.ts`:

```ts
export type GroupCheerType = 'fire' | 'clap' | 'together';

export interface GroupCheerSummary {
  fire: number;
  clap: number;
  together: number;
  mySelection: GroupCheerType | null;
}
```

Add a private row normalizer in `groupApi.ts` that accepts the RPC row and clamps counts with `Math.max(0, Number(...))`, converting non-finite values to zero and accepting only the three known selection strings.

- [ ] **Step 4: Implement the two RPC helpers**

Use exactly these payload keys:

```ts
client.rpc('get_group_daily_cheer_summary', {
  p_group_id: groupId,
  p_receiver_id: receiverId,
});

client.rpc('send_group_daily_cheer', {
  p_group_id: groupId,
  p_receiver_id: receiverId,
  p_cheer_type: type,
});
```

Both functions return the normalized first/single RPC row and use the existing `throwMapped` behavior for Supabase errors.

- [ ] **Step 5: Run focused API tests GREEN**

Run:

```bash
npx vitest run src/group/groupCheerApi.test.ts
```

Expected: PASS.

---

### Task 3: Member-detail cheer UI

**Files:**
- Modify: `src/screens/group/GroupMemberDetailModal.tsx`
- Modify: `src/screens/group/GroupDetailScreen.tsx`
- Modify: `src/screens/group/GroupScreens.css`
- Create: `src/screens/group/GroupMemberCheer.test.tsx`

**Interfaces:**
- `GroupMemberDetailModal` additionally consumes `groupId: string` and `currentUserId?: string`.
- It calls `loadGroupDailyCheerSummary(groupId, member.userId)` on open.
- It calls `sendGroupDailyCheer(groupId, member.userId, type)` for other members only.

- [ ] **Step 1: Write failing UI tests**

Cover these behaviors with Testing Library:

```ts
expect(await screen.findByText('오늘 받은 응원')).toBeInTheDocument();
expect(screen.getByText('🔥 2')).toBeInTheDocument();
expect(screen.getByText('👏 1')).toBeInTheDocument();
expect(screen.getByText('💪 3')).toBeInTheDocument();
```

For another member, assert all three send buttons exist and the confirmed selection has `aria-pressed="true"`. For the current user's own modal, assert `응원 보내기` and the three buttons are absent.

Add a send test where the first confirmed summary is `{fire: 1, clap: 0, together: 0, mySelection: 'fire'}` and the mocked send returns `{fire: 0, clap: 1, together: 0, mySelection: 'clap'}`; after clicking `👏 잘한다!`, assert counts and pressed state switch to the returned server state.

Add a failure test proving the prior confirmed state remains visible and `응원을 보내지 못했습니다.` appears when send rejects.

- [ ] **Step 2: Run the focused UI test and verify RED**

Run:

```bash
npx vitest run src/screens/group/GroupMemberCheer.test.tsx
```

Expected: FAIL because the cheer UI/props do not exist yet.

- [ ] **Step 3: Add transient modal cheer state**

Inside `GroupMemberDetailModal`, add local state only:

```ts
const [cheers, setCheers] = useState<GroupCheerSummary | null>(null);
const [cheerLoading, setCheerLoading] = useState(true);
const [cheerSending, setCheerSending] = useState(false);
const [cheerError, setCheerError] = useState('');
```

Fetch on `(groupId, member.userId)` change. Ignore stale async completion with an effect-local cancellation flag.

- [ ] **Step 4: Render aggregate counts and send controls**

Render counts as three compact chips. For `currentUserId !== member.userId`, render the three fixed buttons with visible emoji/text and `aria-pressed={cheers?.mySelection === type}`. Disable all three while `cheerSending` is true. Re-clicking the selected type still sends or may be safely ignored locally, but must never toggle the value to null.

- [ ] **Step 5: Implement confirmed-state send behavior**

On click:

```ts
setCheerSending(true);
setCheerError('');
try {
  const next = await sendGroupDailyCheer(groupId, member.userId, type);
  setCheers(next);
} catch {
  setCheerError('응원을 보내지 못했습니다.');
} finally {
  setCheerSending(false);
}
```

Do not optimistically mutate counts; the server response is the source of truth.

- [ ] **Step 6: Wire group context and styles**

`GroupDetailScreen` passes `groupId={detail.id}` and `currentUserId={user?.id}` to the modal. Add compact mobile-first styles under the existing group modal styles without changing existing quest/awards/ranking classes.

- [ ] **Step 7: Run focused UI tests GREEN**

Run:

```bash
npx vitest run src/screens/group/GroupMemberCheer.test.tsx
```

Expected: PASS.

---

### Task 4: Full verification and PR handoff

**Files:**
- No production files beyond Tasks 1-3.
- Update/create Draft PR metadata only after fresh verification passes.

**Interfaces:**
- Existing group quests, MVP, weekly awards, rankings, live workout state, owner actions, and workout recording remain behaviorally unchanged.

- [ ] **Step 1: Run full tests**

```bash
npm test
```

Expected: all test files and tests pass with zero failures.

- [ ] **Step 2: Run TypeScript**

```bash
npx tsc -b
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```bash
npx vite build
```

Expected: exit 0. Existing bundle-size warnings are non-blocking unless a new error appears.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors. Existing unrelated warnings may remain but no new cheer-specific warning is allowed.

- [ ] **Step 5: Re-run Supabase object/security verification**

Confirm the table/RPCs exist, raw table access remains revoked for `anon`/`authenticated`, RLS is enabled, and advisors contain no new cheer-specific blocker.

- [ ] **Step 6: Inspect final branch diff**

Compare `feature/group-weekly-awards-20260821...feature/group-daily-cheers-20260821`. Expected changes are limited to the design/plan docs, one additive Supabase migration, group cheer types/API/tests, member-detail modal wiring/tests, and group CSS.

- [ ] **Step 7: Create or update a Draft PR**

Base: `feature/group-weekly-awards-20260821`

Title:

```text
feat: add daily anonymous group cheers
```

PR body must summarize the anonymity model, Korea-local daily reset semantics, one-row upsert rule, test counts, typecheck/build/lint status, Supabase advisor results, and any deployment limitation such as Vercel build-rate-limit.
