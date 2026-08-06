# Supabase Manual Mid-Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep normal gameplay saved locally while allowing the user to manually back up and restore one anonymous save slot through Supabase without a login screen.

**Architecture:** LocalStorage remains the primary persistence layer. A browser-generated 256-bit device secret is stored only in localStorage, SHA-256 hashed before network use, and passed to two security-definer Supabase RPC functions that save or load one JSONB state slot. SettingsScreen exposes explicit save and restore actions; GameContext owns the restore state replacement so the rest of the app continues to consume one AppState source.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, `@supabase/supabase-js`, Supabase Postgres/RPC/RLS, browser Web Crypto API.

## Global Constraints

- Normal state changes must continue saving immediately to localStorage.
- Supabase writes occur only after the user presses `중간 저장`.
- There is exactly one cloud save slot per browser identity; saving overwrites the previous slot.
- There is no visible login, email, password, OAuth, or Supabase Auth flow.
- The raw anonymous device secret must never be sent to Supabase; only its SHA-256 hex digest is sent.
- The publishable key may be present in frontend configuration; the database password and PostgreSQL connection string must never be committed or shipped to the browser.
- Table access must be revoked from `anon` and `authenticated`; access is through named RPC functions only.
- A failed cloud save or restore must not delete or corrupt the current local state.
- Restore must require explicit confirmation before replacing local state.
- Restored data must pass the existing `migrateState` path before becoming active.
- Supabase project ref: `dqpehkhnishnwrpnslcj`.
- Supabase URL: `https://dqpehkhnishnwrpnslcj.supabase.co`.
- Publishable key: `sb_publishable_iYe-_fGfOuMNuQuNA-neqg_kUVJ1Rf1`.

---

## File Structure

- Create `supabase/migrations/20260806060100_create_anonymous_game_saves.sql` — table, grants, RPC functions, validation, timestamps.
- Create `src/lib/supabaseClient.ts` — lazy browser client initialization from Vite environment variables.
- Create `src/store/anonymousDevice.ts` — create/read raw device secret and hash it with Web Crypto.
- Create `src/store/anonymousDevice.test.ts` — stable identity and hash behavior.
- Create `src/store/cloudStorage.ts` — typed RPC wrappers and payload validation.
- Create `src/store/cloudStorage.test.ts` — RPC success, no-save, malformed-response, and error behavior.
- Modify `src/store/storage.ts` — expose safe state normalization/serialization helpers and local save timestamp metadata.
- Modify `src/store/storage.test.ts` — timestamp envelope migration and restored-state validation.
- Modify `src/store/GameContext.tsx` — expose manual cloud save/load methods, operation status, and state replacement action.
- Create `src/store/GameContext.cloud.test.tsx` — context orchestration tests.
- Modify `src/screens/SettingsScreen.tsx` — add data management section, save/load buttons, status text, and confirmation dialog.
- Modify `src/screens/SettingsScreen.css` — style the data management panel and states.
- Create `src/screens/SettingsScreen.cloud.test.tsx` — interaction and accessibility tests.
- Modify `package.json` and `package-lock.json` — add `@supabase/supabase-js`.
- Create `.env.example` — document only public Vite Supabase values.

---

### Task 1: Database Schema and Locked-Down RPC Contract

**Files:**
- Create: `supabase/migrations/20260806060100_create_anonymous_game_saves.sql`

**Interfaces:**
- Produces RPC `save_anonymous_game_state(p_device_key_hash text, p_state jsonb, p_client_saved_at timestamptz, p_schema_version integer) returns table(client_saved_at timestamptz, updated_at timestamptz, schema_version integer)`.
- Produces RPC `load_anonymous_game_state(p_device_key_hash text) returns table(state jsonb, client_saved_at timestamptz, updated_at timestamptz, schema_version integer)`.
- Requires a 64-character lowercase hexadecimal SHA-256 device hash.

- [ ] **Step 1: Write the migration with the table and constraints**

```sql
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
```

- [ ] **Step 2: Add the save RPC as `security definer` with a fixed search path**

```sql
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
```

- [ ] **Step 3: Add the load RPC and grant only function execution**

```sql
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
```

- [ ] **Step 4: Apply the migration to project `dqpehkhnishnwrpnslcj`**

Run through Supabase migration tooling with migration name `create_anonymous_game_saves`.

Expected: migration succeeds without altering existing Foodex tables.

- [ ] **Step 5: Verify database security and function behavior**

Run:

```sql
select relrowsecurity
from pg_class
where oid = 'public.anonymous_game_saves'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'anonymous_game_saves';
```

Expected: `relrowsecurity = true`; no direct `anon` or `authenticated` table privileges.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260806060100_create_anonymous_game_saves.sql
git commit -m "feat: add anonymous manual save RPCs"
```

---

### Task 2: Frontend Supabase Client and Anonymous Device Identity

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.env.example`
- Create: `src/lib/supabaseClient.ts`
- Create: `src/store/anonymousDevice.ts`
- Create: `src/store/anonymousDevice.test.ts`

**Interfaces:**
- Produces `getSupabaseClient(): SupabaseClient | null`.
- Produces `getOrCreateAnonymousDeviceSecret(): string`.
- Produces `getAnonymousDeviceHash(): Promise<string>`.

- [ ] **Step 1: Add the Supabase browser dependency**

Run:

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` and `package-lock.json` include the package.

- [ ] **Step 2: Document public environment values only**

Create `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://dqpehkhnishnwrpnslcj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iYe-_fGfOuMNuQuNA-neqg_kUVJ1Rf1
```

Do not add the PostgreSQL URL or password.

- [ ] **Step 3: Write failing identity tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAnonymousDeviceHash,
  getOrCreateAnonymousDeviceSecret,
} from './anonymousDevice';

describe('anonymousDevice', () => {
  beforeEach(() => localStorage.clear());

  it('creates one stable 64-character hex secret per browser storage', () => {
    const first = getOrCreateAnonymousDeviceSecret();
    const second = getOrCreateAnonymousDeviceSecret();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
  });

  it('returns a SHA-256 hex digest instead of the raw secret', async () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint8Array).fill(1);
      return array;
    });
    const secret = getOrCreateAnonymousDeviceSecret();
    const digest = await getAnonymousDeviceHash();
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe(secret);
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

Run:

```bash
npm test -- src/store/anonymousDevice.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 5: Implement device secret generation and hashing**

```ts
const DEVICE_SECRET_KEY = 'workout-card-game:anonymous-device-secret:v1';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateAnonymousDeviceSecret(): string {
  const existing = localStorage.getItem(DEVICE_SECRET_KEY);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = bytesToHex(bytes);
  localStorage.setItem(DEVICE_SECRET_KEY, secret);
  return secret;
}

export async function getAnonymousDeviceHash(): Promise<string> {
  const secret = getOrCreateAnonymousDeviceSecret();
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}
```

- [ ] **Step 6: Implement a lazy Supabase client**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    client = null;
    return client;
  }

  client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
```

- [ ] **Step 7: Run identity tests**

Run:

```bash
npm test -- src/store/anonymousDevice.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/supabaseClient.ts src/store/anonymousDevice.ts src/store/anonymousDevice.test.ts
git commit -m "feat: add anonymous Supabase client identity"
```

---

### Task 3: Local Save Envelope and Safe State Normalization

**Files:**
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Produces `SavedStateEnvelope { state: AppState; savedAt: string; schemaVersion: number }`.
- Produces `normalizeAppState(value: unknown): AppState`.
- Produces `loadStateEnvelope(): SavedStateEnvelope | null`.
- Produces `saveState(state: AppState, savedAt?: string): SavedStateEnvelope`.
- Existing `loadState(): AppState | null` remains available for compatibility.

- [ ] **Step 1: Add failing envelope tests**

```ts
it('stores state with savedAt and schemaVersion metadata', () => {
  const state = createInitialState();
  const result = saveState(state, '2026-08-06T06:00:00.000Z');
  expect(result.savedAt).toBe('2026-08-06T06:00:00.000Z');
  expect(result.schemaVersion).toBe(1);
  expect(loadStateEnvelope()).toEqual(result);
});

it('loads legacy raw AppState values through the migration path', () => {
  const legacy = createInitialState();
  localStorage.setItem('workout-card-game:v1', JSON.stringify(legacy));
  expect(loadStateEnvelope()?.state.user.name).toBe('헬스 초보');
});

it('rejects cloud values that do not resemble AppState', () => {
  expect(() => normalizeAppState({ user: null })).toThrow('invalid app state');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/store/storage.test.ts
```

Expected: FAIL for missing envelope functions.

- [ ] **Step 3: Implement envelope compatibility and minimal structural validation**

Use these exact exported shapes:

```ts
export const STATE_SCHEMA_VERSION = 1;

export interface SavedStateEnvelope {
  state: AppState;
  savedAt: string;
  schemaVersion: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeAppState(value: unknown): AppState {
  if (!isRecord(value) || !isRecord(value.user)) throw new Error('invalid app state');
  if (!Array.isArray(value.workoutLogs) || !isRecord(value.ownedCards)) {
    throw new Error('invalid app state');
  }
  return migrateState(value as LegacyAppState);
}
```

`loadStateEnvelope()` must recognize both the new envelope and the existing raw AppState. For legacy raw state, use a deterministic fallback `savedAt` from `user.createdAt` when valid, otherwise the Unix epoch. `saveState()` must write the new envelope and return it. `loadState()` must return `loadStateEnvelope()?.state ?? null`.

- [ ] **Step 4: Run storage tests**

Run:

```bash
npm test -- src/store/storage.test.ts
```

Expected: PASS, including all existing migration tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: add timestamped local save envelope"
```

---

### Task 4: Typed Cloud Storage RPC Adapter

**Files:**
- Create: `src/store/cloudStorage.ts`
- Create: `src/store/cloudStorage.test.ts`

**Interfaces:**
- Consumes `getSupabaseClient()`, `getAnonymousDeviceHash()`, `normalizeAppState()`, and `STATE_SCHEMA_VERSION`.
- Produces `CloudSaveMetadata`.
- Produces `CloudSaveSnapshot`.
- Produces `saveCloudState(state: AppState, clientSavedAt?: string): Promise<CloudSaveMetadata>`.
- Produces `loadCloudState(): Promise<CloudSaveSnapshot | null>`.

- [ ] **Step 1: Write failing adapter tests with an injected RPC client seam**

Define the module around this narrow internal type:

```ts
type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};
```

Tests must cover:

```ts
it('sends only the SHA-256 device hash and full AppState to save RPC', async () => {});
it('returns null when load RPC returns no rows', async () => {});
it('normalizes a valid cloud state before returning it', async () => {});
it('throws a user-safe error for malformed cloud payloads', async () => {});
it('throws when Supabase configuration is unavailable', async () => {});
```

Use exported test-only functions:

```ts
export function saveCloudStateWithClient(
  client: RpcClient,
  deviceHash: string,
  state: AppState,
  clientSavedAt: string,
): Promise<CloudSaveMetadata>;

export function loadCloudStateWithClient(
  client: RpcClient,
  deviceHash: string,
): Promise<CloudSaveSnapshot | null>;
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/store/cloudStorage.test.ts
```

Expected: FAIL because `cloudStorage.ts` does not exist.

- [ ] **Step 3: Implement exact result types and RPC wrappers**

```ts
export interface CloudSaveMetadata {
  clientSavedAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface CloudSaveSnapshot extends CloudSaveMetadata {
  state: AppState;
}
```

The save adapter must call:

```ts
client.rpc('save_anonymous_game_state', {
  p_device_key_hash: deviceHash,
  p_state: state,
  p_client_saved_at: clientSavedAt,
  p_schema_version: STATE_SCHEMA_VERSION,
});
```

The load adapter must call:

```ts
client.rpc('load_anonymous_game_state', {
  p_device_key_hash: deviceHash,
});
```

Accept Supabase's array response and use the first row. Validate ISO timestamp strings and integer schema version before returning. Convert RPC/internal errors to Korean messages:

- Missing configuration: `중간 저장 서버 설정을 찾을 수 없습니다.`
- Save failure: `중간 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.`
- Load failure: `중간 저장을 불러오지 못했습니다.`
- Invalid state: `저장된 데이터 형식이 올바르지 않습니다.`

- [ ] **Step 4: Run adapter tests**

Run:

```bash
npm test -- src/store/cloudStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/cloudStorage.ts src/store/cloudStorage.test.ts
git commit -m "feat: add manual cloud save adapter"
```

---

### Task 5: GameContext Manual Save and Restore Orchestration

**Files:**
- Modify: `src/store/GameContext.tsx`
- Create: `src/store/GameContext.cloud.test.tsx`

**Interfaces:**
- Consumes `saveCloudState`, `loadCloudState`, and local envelope functions.
- Produces context fields:

```ts
type CloudOperationStatus = 'idle' | 'saving' | 'loading' | 'success' | 'error';

interface CloudSaveUiState {
  status: CloudOperationStatus;
  message: string | null;
  lastSavedAt: string | null;
  availableCloudSavedAt: string | null;
}

saveMidpoint(): Promise<boolean>;
inspectMidpoint(): Promise<CloudSaveSnapshot | null>;
restoreMidpoint(snapshot: CloudSaveSnapshot): void;
clearCloudMessage(): void;
```

- [ ] **Step 1: Write failing context tests**

Cover these behaviors:

```ts
it('continues saving each state change to localStorage only', async () => {});
it('calls saveCloudState only when saveMidpoint is invoked', async () => {});
it('exposes success metadata after a manual save', async () => {});
it('keeps current state unchanged after cloud save failure', async () => {});
it('does not replace state during inspectMidpoint', async () => {});
it('replaces and locally persists state only after restoreMidpoint', async () => {});
```

Mock `cloudStorage.ts` and render a test consumer inside `GameProvider`.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/store/GameContext.cloud.test.tsx
```

Expected: FAIL because context methods are missing.

- [ ] **Step 3: Add a reducer replacement action**

Extend `Action`:

```ts
| { type: 'REPLACE_STATE'; state: AppState };
```

Handle it with:

```ts
case 'REPLACE_STATE':
  return action.state;
```

- [ ] **Step 4: Add cloud UI state and manual methods**

Use `useState` for `CloudSaveUiState`; do not place transient network state inside `AppState`.

`saveMidpoint()`:
1. Set status to `saving`.
2. Save the current `state` with `new Date().toISOString()`.
3. On success, set `status: 'success'`, `message: '중간 저장이 완료되었습니다.'`, and `lastSavedAt` from the RPC result.
4. On failure, set `status: 'error'` with the thrown message and return `false`.

`inspectMidpoint()`:
1. Set status to `loading`.
2. Load and validate the snapshot.
3. Return `null` with `저장된 중간 데이터가 없습니다.` when no row exists.
4. Store `availableCloudSavedAt` but do not dispatch replacement.

`restoreMidpoint(snapshot)`:
1. Dispatch `REPLACE_STATE` with `snapshot.state`.
2. Call `saveState(snapshot.state, snapshot.clientSavedAt)` immediately so reload cannot revert the restoration.
3. Set `status: 'success'`, `message: '중간 저장 데이터를 불러왔습니다.'`, and `lastSavedAt`.

- [ ] **Step 5: Run context tests and existing store tests**

Run:

```bash
npm test -- src/store/GameContext.cloud.test.tsx src/store/storage.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/GameContext.tsx src/store/GameContext.cloud.test.tsx
git commit -m "feat: expose manual midpoint save actions"
```

---

### Task 6: Settings Data Management UI

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.css`
- Create: `src/screens/SettingsScreen.cloud.test.tsx`

**Interfaces:**
- Consumes GameContext cloud methods and `cloudSaveUi` state.
- Produces accessible buttons `중간 저장` and `중간 저장 불러오기`.

- [ ] **Step 1: Write failing UI tests**

```ts
it('shows manual cloud save controls in a 데이터 관리 section', () => {});
it('disables both controls while saving or loading', () => {});
it('shows the formatted last save time after success', async () => {});
it('asks for confirmation before restoring cloud data', async () => {});
it('does not restore when the confirmation is cancelled', async () => {});
it('announces save and error messages through aria-live', async () => {});
```

Mock `useGame()` with the full existing context surface plus the new cloud fields.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/screens/SettingsScreen.cloud.test.tsx
```

Expected: FAIL because controls are absent.

- [ ] **Step 3: Add the data management section**

Add below existing profile/goal settings:

```tsx
<section className="settings-card settings-cloud-save" aria-labelledby="cloud-save-title">
  <div className="settings-cloud-save__header">
    <div>
      <p className="settings-eyebrow">데이터 관리</p>
      <h2 id="cloud-save-title">중간 저장</h2>
    </div>
    <span className="settings-cloud-save__badge">로그인 없음</span>
  </div>
  <p className="settings-cloud-save__description">
    평소 기록은 이 기기에 저장됩니다. 필요할 때 현재 상태를 서버에 한 번 백업해 두세요.
  </p>
  {/* last saved label, buttons, aria-live message */}
</section>
```

Button behavior:
- `중간 저장`: call `await saveMidpoint()`.
- `중간 저장 불러오기`: call `await inspectMidpoint()`. If a snapshot exists, show an in-app confirmation dialog displaying cloud timestamp and warning that current local data will be replaced.
- Confirmation `불러오기`: call `restoreMidpoint(snapshot)`.
- Cancellation: close dialog without context mutation.

Use `Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })` for timestamps.

- [ ] **Step 4: Add responsive styles**

Include classes for:

```css
.settings-cloud-save {}
.settings-cloud-save__header {}
.settings-cloud-save__badge {}
.settings-cloud-save__description {}
.settings-cloud-save__actions {}
.settings-cloud-save__status {}
.settings-cloud-save__dialog-backdrop {}
.settings-cloud-save__dialog {}
```

At widths below 420px, stack both action buttons vertically and keep each at least 44px high.

- [ ] **Step 5: Run UI tests**

Run:

```bash
npm test -- src/screens/SettingsScreen.cloud.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.css src/screens/SettingsScreen.cloud.test.tsx
git commit -m "feat: add manual midpoint save controls"
```

---

### Task 7: Integration, Security Review, and Deployment Verification

**Files:**
- Modify only if failures require focused fixes in files from Tasks 1–6.

**Interfaces:**
- Verifies the complete database-to-UI flow without introducing automatic cloud writes.

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all tests pass. Record any pre-existing unrelated failures separately; do not hide them.

- [ ] **Step 2: Run lint and production build**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit 0; PWA generation completes with the existing 3 MiB cache limit.

- [ ] **Step 3: Run Supabase security and performance advisors**

Check both advisor categories for project `dqpehkhnishnwrpnslcj`.

Expected: no warning for missing RLS on `anonymous_game_saves`, no public table privilege exposure, and no mutable search-path warning for the two RPC functions.

- [ ] **Step 4: Perform manual preview verification**

In a fresh browser profile:

1. Open the Vercel Preview.
2. Change profile name or weekly goal.
3. Reload and verify local persistence before any cloud save.
4. Open Settings and press `중간 저장`.
5. Verify `중간 저장이 완료되었습니다.` and a timestamp.
6. Change the profile name again.
7. Press `중간 저장 불러오기` and cancel; verify current state remains.
8. Repeat, confirm restore, and verify the earlier cloud state replaces local state.
9. Reload and verify the restored state remains locally.
10. Disable the network and verify normal local changes still persist while cloud action shows an error.

- [ ] **Step 5: Verify no sensitive credentials were committed**

Run:

```bash
git grep -n "postgresql://\|YOUR-PASSWORD\|service_role\|SUPABASE_SERVICE_ROLE"
```

Expected: no matches in application or committed environment files.

- [ ] **Step 6: Verify no automatic cloud-save call exists**

Run:

```bash
git grep -n "saveCloudState" src
```

Expected: references only in `cloudStorage.ts`, tests, and the explicit `saveMidpoint()` implementation; no `useEffect` invokes it when `state` changes.

- [ ] **Step 7: Commit any final focused fixes**

```bash
git add <only-files-changed-by-final-fixes>
git commit -m "fix: complete manual midpoint save integration"
```

Skip this commit when no files changed.

- [ ] **Step 8: Confirm Vercel deployment state**

Expected: latest deployment for `feature/add-equipment-cards-v2` is `READY`, and branch alias serves the new Settings data-management controls.
