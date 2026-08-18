# Authenticated Game Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login-bound Supabase game saves that preserve local-first play, save to the server only at meaningful events, and prevent silent cross-device overwrites with revision checks.

**Architecture:** Keep the existing `AppState` snapshot and localStorage save path intact. Add one `user_game_saves` row per Supabase Auth user, accessed through authenticated RPCs with optimistic `revision` checks; add account-specific local sync metadata and a small coordinator for login reconciliation, dirty tracking, serialized server writes, conflicts, background flushes, and safe logout. Existing anonymous cloud saves remain available only as the logged-out fallback path.

**Tech Stack:** React 19, TypeScript 6, Vitest 3, Testing Library, Supabase JS 2, PostgreSQL/Supabase RLS + security-definer RPCs, Vite 8.

**Spec:** `docs/superpowers/specs/2026-08-18-authenticated-game-save-design.md`

## Global Constraints

- Branch: `feature/add-equipment-cards-v2`; do not merge to `main`.
- Normal gameplay must remain available without login.
- Every `AppState` change continues to save to localStorage immediately.
- Supabase must not be called on a periodic timer; server writes happen only for approved save events, background dirty flush, logout dirty flush, and explicit `지금 저장`.
- Important save events are `COMPLETE_WORKOUT`, `OPEN_PACK`, and `CLAIM_LEVEL_MILESTONE`; set-completion rewards created inside `OPEN_PACK` are included in the same snapshot.
- Lightweight changes such as nickname, selected character, weekly goal, and custom exercise edits only mark local state dirty; they do not immediately call Supabase.
- Supabase failures must never roll back or block already-completed local game actions.
- Cross-device revision mismatch must never silently overwrite server state.
- First account link with both local and server data requires explicit `계정 데이터 사용` / `이 기기 데이터 사용` choice.
- `visibilitychange` to hidden may flush dirty state once; do not depend on `beforeunload` for async persistence.
- Existing `anonymous_game_saves` and its RPCs remain in place for logged-out users during this migration.
- Group tables and group visibility rules are not changed by this feature.
- Frontend continues to use only the Supabase publishable key; no service role key or database password may enter frontend code.
- Reuse `STATE_SCHEMA_VERSION` and `normalizeAppState()` for server snapshots.
- Server write requests from one browser session must be serialized so a device cannot conflict with its own in-flight save.

---

## File Structure

**Create**
- `supabase/migrations/20260818_authenticated_game_saves.sql` — account save table, RLS, authenticated load/save RPCs and grants.
- `src/store/accountSyncMetadata.ts` — account-specific local sync metadata storage and dirty calculation.
- `src/store/accountSyncMetadata.test.ts` — metadata persistence/dirty tests.
- `src/store/accountCloudStorage.ts` — authenticated Supabase RPC wrappers and typed revision conflict error.
- `src/store/accountCloudStorage.test.ts` — RPC wrapper tests.
- `src/store/accountSyncCoordinator.ts` — pure reconciliation decisions plus serialized save queue abstraction.
- `src/store/accountSyncCoordinator.test.ts` — first-link, clean/dirty, conflict, serialization tests.
- `src/components/AccountSaveConflictModal.tsx` — explicit server-vs-device choice UI.
- `src/components/AccountSaveConflictModal.css` — modal presentation.

**Modify**
- `src/store/storage.ts` — expose/load stable local envelope timestamps without changing the `AppState` schema.
- `src/store/storage.test.ts` — verify envelope timestamp behavior remains stable across load.
- `src/store/GameContext.tsx` — connect auth session to account save coordinator, preserve local-first writes, trigger important/background/manual saves, expose account sync UI/actions.
- `src/screens/SettingsScreen.tsx` — show anonymous controls while signed out and account-save status/`지금 저장` while signed in.
- `src/screens/SettingsScreen.css` — account-save status styling only.
- `src/screens/group/GroupEntryScreen.tsx` — route sign-out through dirty-save preparation before calling Supabase sign-out.
- `src/App.tsx` — mount the account conflict modal globally inside providers.

---

### Task 1: Create secure account game-save storage in Supabase

**Files:**
- Create: `supabase/migrations/20260818_authenticated_game_saves.sql`

**Interfaces:**
- Produces RPC `load_user_game_state()` returning `state`, `schema_version`, `revision`, `client_saved_at`, `updated_at`.
- Produces RPC `save_user_game_state(p_state jsonb, p_client_saved_at timestamptz, p_schema_version integer, p_expected_revision bigint)` returning `status`, `revision`, `client_saved_at`, `updated_at`, `schema_version`.
- Save `status` is exactly `saved` or `conflict`.
- A missing row is created only when `p_expected_revision IS NULL`; an existing row requires an exact revision match.

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration through the Supabase migration action**

Apply the exact checked-in SQL under migration name `authenticated_game_saves` to project `dqpehkhnishnwrpnslcj`.

Expected: migration succeeds without altering existing anonymous/group tables.

- [ ] **Step 3: Verify schema, RLS, and grants**

Run:

```sql
select relname, relrowsecurity
from pg_class
where relname = 'user_game_saves';

select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'user_game_saves';

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('load_user_game_state', 'save_user_game_state')
order by routine_name, grantee;
```

Expected: `relrowsecurity = true`; one authenticated SELECT-own policy; RPC execute granted to `authenticated` and not `anon`/`PUBLIC`.

- [ ] **Step 4: Commit the migration**

```bash
git add supabase/migrations/20260818_authenticated_game_saves.sql
git commit -m "feat: add authenticated game save storage"
```

---

### Task 2: Add persistent account sync metadata and stable local timestamps

**Files:**
- Create: `src/store/accountSyncMetadata.ts`
- Create: `src/store/accountSyncMetadata.test.ts`
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Produces `AccountSyncMetadata` with `userId`, `serverRevision`, `lastSyncedLocalSavedAt`, `lastServerUpdatedAt`, `linked`.
- Produces `loadAccountSyncMetadata(userId)`, `saveAccountSyncMetadata(metadata)`, `clearAccountSyncMetadata(userId)`, `isLocalDirty(localSavedAt, metadata)`.
- `loadStateEnvelope()` remains the canonical way to obtain current state plus local `savedAt`.

- [ ] **Step 1: Write failing metadata tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAccountSyncMetadata,
  isLocalDirty,
  loadAccountSyncMetadata,
  saveAccountSyncMetadata,
} from './accountSyncMetadata';

describe('account sync metadata', () => {
  beforeEach(() => localStorage.clear());

  it('isolates metadata by auth user id', () => {
    saveAccountSyncMetadata({
      userId: 'user-a', serverRevision: 3,
      lastSyncedLocalSavedAt: '2026-08-18T10:00:00.000Z',
      lastServerUpdatedAt: '2026-08-18T10:00:01.000Z', linked: true,
    });
    expect(loadAccountSyncMetadata('user-a')?.serverRevision).toBe(3);
    expect(loadAccountSyncMetadata('user-b')).toBeNull();
  });

  it('treats a newer local envelope as dirty', () => {
    const meta = {
      userId: 'user-a', serverRevision: 3,
      lastSyncedLocalSavedAt: '2026-08-18T10:00:00.000Z',
      lastServerUpdatedAt: '2026-08-18T10:00:01.000Z', linked: true,
    };
    expect(isLocalDirty('2026-08-18T10:00:02.000Z', meta)).toBe(true);
    expect(isLocalDirty('2026-08-18T10:00:00.000Z', meta)).toBe(false);
  });

  it('clears only the requested account metadata', () => {
    saveAccountSyncMetadata({ userId: 'user-a', serverRevision: 1, lastSyncedLocalSavedAt: null, lastServerUpdatedAt: null, linked: true });
    clearAccountSyncMetadata('user-a');
    expect(loadAccountSyncMetadata('user-a')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/store/accountSyncMetadata.test.ts`

Expected: FAIL because `accountSyncMetadata.ts` does not exist.

- [ ] **Step 3: Implement metadata helpers**

```ts
const ACCOUNT_SYNC_KEY_PREFIX = 'workout-card-game:account-sync:v1:';

export interface AccountSyncMetadata {
  userId: string;
  serverRevision: number | null;
  lastSyncedLocalSavedAt: string | null;
  lastServerUpdatedAt: string | null;
  linked: boolean;
}

function key(userId: string) { return `${ACCOUNT_SYNC_KEY_PREFIX}${userId}`; }

export function loadAccountSyncMetadata(userId: string): AccountSyncMetadata | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountSyncMetadata;
    return parsed.userId === userId ? parsed : null;
  } catch { return null; }
}

export function saveAccountSyncMetadata(value: AccountSyncMetadata): void {
  localStorage.setItem(key(value.userId), JSON.stringify(value));
}

export function clearAccountSyncMetadata(userId: string): void {
  localStorage.removeItem(key(userId));
}

export function isLocalDirty(localSavedAt: string | null, metadata: AccountSyncMetadata | null): boolean {
  if (!localSavedAt) return false;
  if (!metadata?.lastSyncedLocalSavedAt) return true;
  return Date.parse(localSavedAt) > Date.parse(metadata.lastSyncedLocalSavedAt);
}
```

Also extend `storage.test.ts` with a test that `loadStateEnvelope()` returns the same persisted `savedAt` instead of inventing a newer timestamp when reading an envelope.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/store/accountSyncMetadata.test.ts src/store/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/accountSyncMetadata.ts src/store/accountSyncMetadata.test.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: track account save sync metadata"
```

---

### Task 3: Add authenticated cloud-save RPC wrappers

**Files:**
- Create: `src/store/accountCloudStorage.ts`
- Create: `src/store/accountCloudStorage.test.ts`

**Interfaces:**
- Produces `AccountCloudSaveRecord` with `state`, `schemaVersion`, `revision`, `clientSavedAt`, `updatedAt`.
- Produces `loadAccountCloudState(): Promise<AccountCloudSaveRecord | null>`.
- Produces `saveAccountCloudState(state, clientSavedAt, expectedRevision): Promise<AccountCloudSaveRecord metadata shape>`.
- Produces `AccountRevisionConflictError` carrying `currentRevision`.

- [ ] **Step 1: Write failing RPC wrapper tests**

Mock `getSupabaseClient()` and assert:

```ts
it('loads and normalizes an authenticated account snapshot', async () => {
  rpc.mockResolvedValue({ data: [{ state: createInitialState(), schema_version: 1, revision: 4, client_saved_at: savedAt, updated_at: updatedAt }], error: null });
  const result = await loadAccountCloudState();
  expect(rpc).toHaveBeenCalledWith('load_user_game_state');
  expect(result?.revision).toBe(4);
});

it('sends expected revision when saving', async () => {
  rpc.mockResolvedValue({ data: [{ status: 'saved', revision: 5, client_saved_at: savedAt, updated_at: updatedAt, schema_version: 1 }], error: null });
  await saveAccountCloudState(createInitialState(), savedAt, 4);
  expect(rpc).toHaveBeenCalledWith('save_user_game_state', expect.objectContaining({ p_expected_revision: 4 }));
});

it('throws a typed error on revision conflict', async () => {
  rpc.mockResolvedValue({ data: [{ status: 'conflict', revision: 7, client_saved_at: savedAt, updated_at: updatedAt, schema_version: 1 }], error: null });
  await expect(saveAccountCloudState(createInitialState(), savedAt, 4)).rejects.toMatchObject({ currentRevision: 7 });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/store/accountCloudStorage.test.ts`

Expected: FAIL because the wrapper module does not exist.

- [ ] **Step 3: Implement the wrapper**

Use `getSupabaseClient()`, `STATE_SCHEMA_VERSION`, and `normalizeAppState()`. Map snake_case RPC rows to camelCase types. Treat missing load rows as `null`. Validate timestamps/revision and throw on malformed server responses. On `status === 'conflict'`, throw `new AccountRevisionConflictError(Number(row.revision))`; do not return a successful save record.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/store/accountCloudStorage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/accountCloudStorage.ts src/store/accountCloudStorage.test.ts
git commit -m "feat: add authenticated cloud save api"
```

---

### Task 4: Implement reconciliation decisions and serialized server writes

**Files:**
- Create: `src/store/accountSyncCoordinator.ts`
- Create: `src/store/accountSyncCoordinator.test.ts`

**Interfaces:**
- Produces `decideAccountReconciliation(input): 'upload-local' | 'keep-local' | 'use-server' | 'prompt'`.
- Produces `createAccountSaveQueue(saveFn)` with `enqueue(snapshot): Promise<AccountCloudSaveRecord>` and no parallel invocation of `saveFn`.
- Reconciliation input includes `metadata`, `serverRecord`, `localSavedAt`, and `localDirty`.

- [ ] **Step 1: Write failing reconciliation tests**

```ts
it('uploads local state when account has no server save', () => {
  expect(decideAccountReconciliation({ metadata: null, serverRecord: null, localSavedAt: localAt, localDirty: true })).toBe('upload-local');
});

it('prompts on first link when a server save exists', () => {
  expect(decideAccountReconciliation({ metadata: null, serverRecord, localSavedAt: localAt, localDirty: true })).toBe('prompt');
});

it('uses newer server state automatically when linked local state is clean', () => {
  expect(decideAccountReconciliation({ metadata: linkedRevision3, serverRecord: { ...serverRecord, revision: 4 }, localSavedAt: syncedAt, localDirty: false })).toBe('use-server');
});

it('prompts when server advanced and local is dirty', () => {
  expect(decideAccountReconciliation({ metadata: linkedRevision3, serverRecord: { ...serverRecord, revision: 4 }, localSavedAt: newerLocalAt, localDirty: true })).toBe('prompt');
});
```

- [ ] **Step 2: Add a failing queue serialization test**

```ts
it('never runs two account saves concurrently', async () => {
  let active = 0;
  let maxActive = 0;
  const saveFn = vi.fn(async (snapshot) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await deferredFor(snapshot.id).promise;
    active -= 1;
    return snapshot.result;
  });
  const queue = createAccountSaveQueue(saveFn);
  const first = queue.enqueue(firstSnapshot);
  const second = queue.enqueue(secondSnapshot);
  expect(maxActive).toBe(1);
  resolveFirst();
  await first;
  resolveSecond();
  await second;
  expect(maxActive).toBe(1);
});
```

- [ ] **Step 3: Run and verify RED**

Run: `npm test -- src/store/accountSyncCoordinator.test.ts`

Expected: FAIL because coordinator functions do not exist.

- [ ] **Step 4: Implement pure decision logic and queue**

Decision rules:

```ts
if (!serverRecord) return 'upload-local';
if (!metadata?.linked) return 'prompt';
if (serverRecord.revision === metadata.serverRevision) return 'keep-local';
if (!localDirty) return 'use-server';
return 'prompt';
```

Queue behavior:
- each enqueue chains after the previous attempt, even when the previous attempt rejects;
- the second write starts only after the first has resolved/rejected;
- callers still receive their own promise result/error;
- no retry loop is added here.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/store/accountSyncCoordinator.test.ts`

Expected: PASS.

```bash
git add src/store/accountSyncCoordinator.ts src/store/accountSyncCoordinator.test.ts
git commit -m "feat: coordinate account save reconciliation"
```

---

### Task 5: Integrate account sync into GameProvider without weakening local-first saves

**Files:**
- Modify: `src/store/GameContext.tsx`
- Create: `src/store/GameContext.accountSync.test.tsx`

**Interfaces:**
- `GameContextValue` adds:
  - `accountSyncStatus: 'signed-out' | 'checking' | 'linked' | 'saving' | 'error' | 'conflict'`
  - `accountSyncMessage: string`
  - `accountLastSavedAt: string | null`
  - `accountConflict: { server: AccountCloudSaveRecord; localSavedAt: string } | null`
  - `saveAccountNow(): Promise<void>`
  - `resolveAccountConflict(choice: 'server' | 'device'): Promise<void>`
  - `prepareAccountSignOut(): Promise<'ready' | 'save-failed'>`
- Existing anonymous `saveManualCloudSlot/loadManualCloudSlot/restoreManualCloudSlot` remain available for signed-out Settings UI.

- [ ] **Step 1: Write failing provider tests for signed-out behavior**

Render `GameProvider` under a mocked `GroupAuthProvider` value with `user: null`. Dispatch a lightweight state update and assert:
- localStorage envelope changes;
- `loadAccountCloudState` and `saveAccountCloudState` are not called.

- [ ] **Step 2: Write failing first-login tests**

Cases:
1. `loadAccountCloudState()` returns `null` → current local state is uploaded once with `expectedRevision = null`, metadata becomes linked.
2. server record exists and no metadata → `accountSyncStatus === 'conflict'` and no overwrite occurs before user choice.
3. linked metadata revision 3 + server revision 4 + clean local → provider dispatches `REPLACE_STATE` with normalized server state and updates local envelope/metadata.

- [ ] **Step 3: Write failing important-event and lightweight-event tests**

Assert:
- `SET_USER_NAME`, `SET_WEEKLY_GOAL`, `SET_SELECTED_CHARACTER`, custom exercise mutations do not immediately call `saveAccountCloudState`.
- `COMPLETE_WORKOUT`, `OPEN_PACK`, `CLAIM_LEVEL_MILESTONE` result in a server save of the **post-reducer** state, not the previous state.
- two important events fired before the first network call completes are serialized and use the latest revision returned by the prior save.

- [ ] **Step 4: Write failing background and conflict tests**

Simulate `document.visibilityState = 'hidden'` plus `visibilitychange`:
- clean account → no server call;
- dirty account → one server call.

Make `saveAccountCloudState` reject with `AccountRevisionConflictError`; assert local game action remains committed, status becomes `conflict`, and provider loads the latest server record for the choice modal instead of retrying overwrite.

- [ ] **Step 5: Implement stable local-save timestamp handling**

Initialize the reducer from `loadStateEnvelope()?.state ?? createInitialState()` and retain the envelope `savedAt`. Do not create a newer local timestamp merely because the provider mounted. On actual state changes:

```ts
const envelope = saveState(state);
localSavedAtRef.current = envelope.savedAt;
```

Use an initial-mount guard so an unchanged loaded state does not become dirty simply by reopening the app.

- [ ] **Step 6: Implement auth reconciliation and save triggers**

Use `useGroupAuth()` inside `GameProvider` (the provider order in `App.tsx` already permits this). On `user?.id` change:
- signed out → reset account UI state only; keep local game state;
- signed in → load server record once, load per-user metadata, calculate dirty, call `decideAccountReconciliation`;
- `upload-local` → enqueue initial save with expected revision `null`;
- `keep-local` → linked with no write;
- `use-server` → replace state and local envelope with server snapshot, then update metadata;
- `prompt` → retain both states and set conflict UI state.

For critical actions, mark a `pendingImportantSaveRef` **before** dispatch and consume it in the post-state-change effect after `saveState(state)` has persisted the new state. This guarantees the server snapshot contains the reducer result.

- [ ] **Step 7: Implement explicit/background/logout saves**

`saveAccountNow()` enqueues only when signed in and dirty, except the user-facing button may still report `이미 최신 상태입니다` when clean.

On hidden visibility, call the same save path only when dirty.

`prepareAccountSignOut()`:
- clean/signed out → `ready`;
- dirty + save succeeds → `ready`;
- dirty + network/auth error or unresolved conflict → `save-failed`.

Do not clear localStorage on sign-out.

- [ ] **Step 8: Run focused provider tests**

Run: `npm test -- src/store/GameContext.accountSync.test.tsx src/store/storage.test.ts src/store/accountSyncMetadata.test.ts src/store/accountCloudStorage.test.ts src/store/accountSyncCoordinator.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/store/GameContext.tsx src/store/GameContext.accountSync.test.tsx
git commit -m "feat: sync game state to signed in accounts"
```

---

### Task 6: Add explicit conflict choice, account-save Settings UI, and safe sign-out

**Files:**
- Create: `src/components/AccountSaveConflictModal.tsx`
- Create: `src/components/AccountSaveConflictModal.css`
- Modify: `src/App.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.css`
- Modify: `src/screens/group/GroupEntryScreen.tsx`
- Create: `src/components/AccountSaveConflictModal.test.tsx`

**Interfaces:**
- Modal consumes `accountConflict` and `resolveAccountConflict(choice)` from `useGame()`.
- Settings consumes `user` from `useGroupAuth()` and account-sync fields/actions from `useGame()`.
- Group sign-out consumes `prepareAccountSignOut()` before existing auth `signOut()`.

- [ ] **Step 1: Write failing conflict modal tests**

Test copy/actions:
- when no conflict → renders nothing;
- when conflict → renders `계정 데이터 사용` and `이 기기 데이터 사용`;
- server button calls `resolveAccountConflict('server')`;
- device button calls `resolveAccountConflict('device')`;
- choice buttons are disabled while account save status is `saving`.

- [ ] **Step 2: Implement the modal and mount it globally**

Use a blocking but compact modal with this copy:

```tsx
<h2>저장 데이터가 서로 달라요</h2>
<p>계정에 저장된 데이터와 이 기기의 데이터가 모두 변경되었습니다. 사용할 데이터를 선택해 주세요.</p>
<button>계정 데이터 사용</button>
<button>이 기기 데이터 사용</button>
```

Mount `<AccountSaveConflictModal />` in `AppShell` alongside `CardSetCompletionModal`, inside both `GroupAuthProvider` and `GameProvider`.

- [ ] **Step 3: Update Settings UI by auth state**

When signed out, retain the existing anonymous cloud section and copy.

When signed in, replace the visible cloud controls with:
- heading `계정 데이터 저장`;
- badge `☁️ 계정 저장됨` for linked/clean, or corresponding saving/error/conflict copy;
- formatted last successful account save time;
- one primary `지금 저장` button calling `saveAccountNow()`;
- no `중간 저장 불러오기` button for the account path.

Do not remove anonymous methods from `GameContext` in this task.

- [ ] **Step 4: Route group sign-out through save preparation**

Replace direct `onClick={() => signOut()}` with:

```ts
async function handleSignOut() {
  const result = await prepareAccountSignOut();
  if (result === 'ready') {
    await signOut();
    return;
  }
  if (window.confirm('저장에 실패했습니다. 그래도 로그아웃할까요?')) {
    await signOut();
  }
}
```

Disable the button while an account save is actively running to avoid duplicate sign-out requests.

- [ ] **Step 5: Run UI tests**

Run: `npm test -- src/components/AccountSaveConflictModal.test.tsx src/group/GroupAuthContext.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AccountSaveConflictModal.tsx src/components/AccountSaveConflictModal.css src/components/AccountSaveConflictModal.test.tsx src/App.tsx src/screens/SettingsScreen.tsx src/screens/SettingsScreen.css src/screens/group/GroupEntryScreen.tsx
git commit -m "feat: add account save conflict and controls"
```

---

### Task 7: Verify database behavior, full tests, build, and preview deployment

**Files:**
- No new source file required unless verification finds a defect; fixes must be committed separately with a descriptive message.

**Interfaces:**
- Consumes all previous tasks.
- Produces evidence that local-only play, authenticated account saves, revision conflicts, UI choice, and build all work together.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`

Expected: all Vitest tests pass, including existing anonymous save/storage/group tests and new account sync tests.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: `tsc -b` and `vite build` both succeed. Existing non-fatal chunk-size warnings are acceptable; TypeScript or Vite errors are not.

- [ ] **Step 3: Verify authenticated RPC behavior with a real signed-in preview user**

Manual sequence in preview:
1. Start signed out, make a lightweight local change, reload, verify it remains.
2. Sign in to an account with no `user_game_saves` row; verify one initial row is created and revision is 1.
3. Change nickname only; verify server revision does not immediately increase.
4. Complete a workout; verify server revision increases once and snapshot contains the new workout log.
5. Change another lightweight setting, background the app; verify one dirty flush and one revision increase.
6. Trigger two important saves quickly; verify final state is preserved and no self-conflict UI appears.

- [ ] **Step 4: Verify first-link conflict path**

Use a second browser/profile with local state and sign into an account that already has a server snapshot. Verify:
- choice modal appears before overwrite;
- `계정 데이터 사용` replaces local state with server state;
- with a fresh local change, `이 기기 데이터 사용` writes against the latest server revision and then becomes linked.

- [ ] **Step 5: Verify cross-device revision conflict**

With two linked browser profiles:
1. Device A and B both load revision N.
2. Device A performs an important save → server becomes N+1.
3. Device B makes a local dirty change and performs an important save.
4. Device B must keep its local action, enter conflict state, and show the choice modal; server must remain at A's snapshot until the user chooses.

- [ ] **Step 6: Verify safe logout**

With dirty lightweight changes:
- successful pre-logout save → sign-out proceeds;
- simulated/real network failure → confirmation `저장에 실패했습니다. 그래도 로그아웃할까요?` appears;
- cancel keeps the session;
- continue signs out while local data remains.

- [ ] **Step 7: Check Vercel deployment for the final commit**

Inspect the latest preview deployment for `feature/add-equipment-cards-v2`. Confirm deployment state is READY and inspect build logs for `tsc -b`/Vite success. Do not infer deployment success from GitHub commit creation alone.

- [ ] **Step 8: Final diff review**

Compare the final branch against the pre-feature commit and confirm:
- no unrelated game logic changes;
- no deletion of anonymous save migration/RPCs;
- no service key/secrets committed;
- no change to group privacy tables/policies;
- no `main` merge.

If verification requires fixes, run the relevant focused test first, make the smallest fix, re-run the full suite/build, and commit the fix separately.
