# Group Social Workout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account-backed workout groups with Google/email login, invite-code membership, shared workout time, live workout status, and a minimal session timer without changing the existing anonymous gameplay/save flow.

**Architecture:** Keep `GameContext` and anonymous saves unchanged. Add a separate group/auth subsystem backed by Supabase Auth, RPCs, RLS-protected group tables, and a local-first workout timer that only syncs presence and aggregate time when the user is authenticated. Group UI is entered from the existing app without forcing login for normal gameplay.

**Tech Stack:** React, TypeScript, Supabase Auth/Postgres/RLS/RPC, Vitest, Vite, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-18-group-social-workout-design.md`

## Global Constraints

- Normal gameplay must remain available without login.
- Existing localStorage autosave and anonymous Supabase manual save must keep working.
- Group auth supports Google OAuth and email magic link.
- Initial group nickname defaults to the existing game nickname and can be changed later.
- Maximum 5 groups per user and 20 members per group.
- Group-visible data is limited to today workout time, weekly workout time, weekly goal progress, nickname, and current workout status.
- Exercise names, weights, reps, sets, notes, cards, and detailed game state must never be uploaded to group tables.
- A user is shown as actively working out only while a real workout session timer is running and the heartbeat is fresh.
- Group network failures must never block or invalidate local workout recording.
- Do not merge the PR unless the user explicitly asks.

---

### Task 1: Supabase group schema, RPCs, and RLS

**Files:**
- Create: `supabase/migrations/20260818_group_social_workout.sql`
- Test: SQL verification queries executed against project `dqpehkhnishnwrpnslcj`

**Interfaces:**
- Produces RPCs: `create_group(text)`, `join_group_by_invite_code(text)`, `leave_group(uuid)`, `remove_group_member(uuid, uuid)`, `start_workout_session()`, `heartbeat_workout_session(uuid)`, `end_workout_session(uuid)`, `upsert_group_profile(text)`.
- Produces tables: `group_profiles`, `groups`, `group_members`, `workout_sessions`, `group_activity_daily`.

- [ ] **Step 1: Write the migration with tables and constraints**

```sql
create table public.group_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 30),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code char(6) not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create unique index workout_sessions_one_active_per_user
  on public.workout_sessions(user_id)
  where ended_at is null;

create table public.group_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  workout_seconds integer not null default 0 check (workout_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);
```

- [ ] **Step 2: Add helper functions and transactional RPCs**

Use `security definer` functions with `set search_path = public` and `auth.uid()` checks. `create_group` must generate invite codes from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, retry on collision, reject users already in 5 groups, insert owner membership, and return `group_id, invite_code`. `join_group_by_invite_code` must normalize uppercase input, reject full groups and users already in 5 groups, and be idempotent for an existing membership.

- [ ] **Step 3: Add workout session RPCs**

`start_workout_session()` returns an existing active session if one exists, otherwise inserts one using server time. `heartbeat_workout_session(session_id)` only updates the caller's active session. `end_workout_session(session_id)` sets `ended_at`, computes elapsed seconds from server timestamps, and atomically increments `group_activity_daily` for the caller's local date supplied as an explicit date parameter from the client only if the RPC contract includes it; otherwise use UTC consistently and document the display conversion.

- [ ] **Step 4: Enable RLS and policies**

Policies must enforce:
- users may read/update only their own `group_profiles` row;
- users may read a group only if they are a member;
- users may read memberships only for groups they belong to;
- users may read activity/profile rows only for members of a group they also belong to;
- direct writes to group membership, groups, workout sessions, and activity aggregates are denied where RPCs are the intended write path.

- [ ] **Step 5: Apply migration and verify schema**

Run SQL checks for table existence, RLS enabled, RPC signatures, 5-group/20-member limits, owner auto-membership, invite-code join, and stale-heartbeat read logic.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260818_group_social_workout.sql
git commit -m "feat: add group workout database schema"
```

---

### Task 2: Supabase Auth session support without breaking anonymous saves

**Files:**
- Modify: `src/lib/supabaseClient.ts`
- Create: `src/group/groupTypes.ts`
- Create: `src/group/groupAuthApi.ts`
- Create: `src/group/GroupAuthContext.tsx`
- Test: `src/group/GroupAuthContext.test.tsx`

**Interfaces:**
- Produces `GroupAuthProvider`, `useGroupAuth()`.
- Produces `signInWithGoogle()`, `sendMagicLink(email)`, `signOutGroupAccount()`.

- [ ] **Step 1: Write failing auth-state tests**

Test that unauthenticated state renders as signed out, auth state updates after Supabase emits a session, and anonymous game APIs do not depend on auth state.

- [ ] **Step 2: Update Supabase client auth options**

```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}
```

Do not change anonymous save RPC parameters or device-key logic.

- [ ] **Step 3: Implement auth API**

```ts
export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_UNAVAILABLE');
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
}

export async function sendMagicLink(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_UNAVAILABLE');
  return client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
}
```

- [ ] **Step 4: Implement `GroupAuthContext`**

Track `session`, `user`, `loading`, and auth actions using `getSession()` plus `onAuthStateChange()`.

- [ ] **Step 5: Run tests**

Run `npm test -- GroupAuthContext` and verify PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabaseClient.ts src/group
git commit -m "feat: add group auth session support"
```

---

### Task 3: Group API and selectors

**Files:**
- Create: `src/group/groupApi.ts`
- Create: `src/group/groupSelectors.ts`
- Test: `src/group/groupSelectors.test.ts`

**Interfaces:**
- Produces `loadMyGroups()`, `loadGroupDetail(groupId)`, `createGroup(name)`, `joinGroup(code)`, `leaveGroup(groupId)`, `removeGroupMember(groupId, memberId)`, `upsertGroupProfile(nickname)`.
- Produces selector `rankGroupMembers(members)` sorting weekly goal completion first, weekly seconds second.

- [ ] **Step 1: Write selector tests**

Include ties, zero-goal edge cases, active/inactive flags, and deterministic nickname fallback.

- [ ] **Step 2: Implement typed API wrappers**

All RPC errors should be mapped to stable app-facing codes such as `GROUP_LIMIT_REACHED`, `GROUP_FULL`, `INVALID_INVITE_CODE`, `ALREADY_MEMBER`, `OWNER_CANNOT_LEAVE`.

- [ ] **Step 3: Implement group detail query**

Fetch only data necessary for the group screen: group id/name/invite code if owner, member id/nickname, today seconds, week seconds, goal percentage, and last heartbeat-derived active status. Do not fetch workout detail rows.

- [ ] **Step 4: Run tests**

Run `npm test -- groupSelectors`.

- [ ] **Step 5: Commit**

```bash
git add src/group/groupApi.ts src/group/groupSelectors.ts src/group/groupSelectors.test.ts
git commit -m "feat: add group data API and ranking"
```

---

### Task 4: Group entry, auth, profile, list, and detail screens

**Files:**
- Create: `src/screens/group/GroupEntryScreen.tsx`
- Create: `src/screens/group/GroupAuthScreen.tsx`
- Create: `src/screens/group/GroupProfileSetup.tsx`
- Create: `src/screens/group/GroupListScreen.tsx`
- Create: `src/screens/group/GroupDetailScreen.tsx`
- Create: `src/screens/group/GroupMemberDetailModal.tsx`
- Create: `src/screens/group/GroupScreens.css`
- Modify: `src/App.tsx`
- Modify: `src/screens/HomeScreen.tsx` or `src/screens/SettingsScreen.tsx` for a single group-entry button
- Test: `src/screens/group/GroupEntryScreen.test.tsx`

**Interfaces:**
- Adds `group` to `ScreenId`.
- `GroupEntryScreen` receives existing game nickname as initial profile suggestion.

- [ ] **Step 1: Write routing/auth-gate tests**

Verify signed-out users see Google + email login, signed-in users without a profile see nickname setup, and signed-in profiled users see group list.

- [ ] **Step 2: Add a single group entry point**

Do not add a sixth bottom-nav item in this MVP. Add one clearly visible `그룹` entry from Home or Settings.

- [ ] **Step 3: Implement auth screen**

Include Google button, email input, magic-link send state, and concise error messages.

- [ ] **Step 4: Implement profile setup**

Pre-fill existing game nickname, enforce 2–20 characters, trim whitespace, and save through `upsertGroupProfile`.

- [ ] **Step 5: Implement group list**

Show create/join actions, up to 5 groups, member count, and weekly total summary.

- [ ] **Step 6: Implement group detail**

Show ranked members with nickname, today time, weekly time, weekly goal percentage, and `🔥 운동 중` when heartbeat is fresh. Member detail modal shows only allowed aggregate information.

- [ ] **Step 7: Run tests**

Run `npm test -- GroupEntryScreen`.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/screens/group src/screens/HomeScreen.tsx src/screens/SettingsScreen.tsx
git commit -m "feat: add workout group screens"
```

---

### Task 5: Local-first workout session timer and live presence sync

**Files:**
- Create: `src/hooks/useWorkoutSessionTimer.ts`
- Create: `src/group/workoutSessionApi.ts`
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordScreen.css`
- Test: `src/hooks/useWorkoutSessionTimer.test.ts`

**Interfaces:**
- Produces `useWorkoutSessionTimer()` with `{ status, elapsedSeconds, start, stop }`.
- Authenticated users sync through Supabase; signed-out users run local timer only.

- [ ] **Step 1: Write timer tests with fake timers**

Verify start, elapsed time, stop, signed-out local mode, authenticated sync calls, and network-failure fallback.

- [ ] **Step 2: Implement local timer core**

Use a persisted local start timestamp so UI recovers after component remount. Never require login to start the timer.

- [ ] **Step 3: Implement heartbeat sync**

For authenticated users, call server heartbeat approximately every 60 seconds while active and on visibility regain. Treat stale heartbeat older than the server-defined threshold as inactive on reads.

- [ ] **Step 4: Integrate into `RecordScreen`**

Add a compact top panel:

```text
[ ▶ 운동 시작 ]
```

Active state:

```text
⏱ 00:42:18   운동 중 🔥   [종료]
```

Stopping the timer must not auto-complete the workout form. Completing the workout should stop an active timer first, but a failed group sync must not block `game.completeWorkout(...)`.

- [ ] **Step 5: Run tests**

Run `npm test -- useWorkoutSessionTimer`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useWorkoutSessionTimer.ts src/group/workoutSessionApi.ts src/screens/RecordScreen.tsx src/screens/RecordScreen.css
git commit -m "feat: add workout session timer and presence"
```

---

### Task 6: Group management actions and nickname editing

**Files:**
- Modify: `src/screens/group/GroupListScreen.tsx`
- Modify: `src/screens/group/GroupDetailScreen.tsx`
- Modify: `src/screens/group/GroupScreens.css`
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/screens/group/GroupManagement.test.tsx`

**Interfaces:**
- Uses Task 3 APIs for create/join/leave/remove/profile update.

- [ ] **Step 1: Write management tests**

Cover 5-group limit message, invalid invite code, full group, owner removing a member, owner unable to leave while others remain, and nickname update reflected in UI.

- [ ] **Step 2: Implement create group flow**

Simple modal with 2–30 character group name; show generated 6-character invite code after success.

- [ ] **Step 3: Implement join flow**

Single uppercase 6-character input, normalize pasted code, and surface stable API errors.

- [ ] **Step 4: Implement leave/remove controls**

Only show owner controls when current user is owner. Require confirmation before destructive actions.

- [ ] **Step 5: Add group nickname edit in Settings**

Only show when authenticated. Changing it updates `group_profiles` but does not mutate `state.user.name`.

- [ ] **Step 6: Run tests**

Run `npm test -- GroupManagement`.

- [ ] **Step 7: Commit**

```bash
git add src/screens/group src/screens/SettingsScreen.tsx
git commit -m "feat: add group management controls"
```

---

### Task 7: Integration, regression, build, and deployment verification

**Files:**
- Modify tests as needed only for concrete regressions found during verification.
- Do not make unrelated refactors.

**Interfaces:**
- Validates all previous tasks together.

- [ ] **Step 1: Run full unit test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 3: Verify anonymous regression path**

Manual checks:
- launch signed out;
- create/record workout;
- local autosave still works;
- manual anonymous Supabase save/load still works;
- no auth prompt appears unless entering Group.

- [ ] **Step 4: Verify authenticated group path**

Manual checks:
- Google login works;
- magic link works;
- nickname defaults from game profile and can change independently;
- create group generates 6-character code;
- second account joins via code;
- 5-group/20-member limits return user-facing errors;
- timer start shows `운동 중` to another member after refresh/poll;
- timer stop increments today's and week's duration;
- stale heartbeat clears active status;
- detailed exercise data is not visible through group queries.

- [ ] **Step 5: Verify mobile behavior**

Check Android Chrome and iPhone 15 viewport widths. Group screens and auth forms must remain scrollable with the software keyboard open and respect safe-area bottom padding.

- [ ] **Step 6: Push and verify Vercel preview**

Confirm Vercel preview build is successful. If it fails, inspect exact logs and fix only the reported issue before claiming completion.

- [ ] **Step 7: Record final commit and PR status**

Leave the existing PR unmerged unless explicitly instructed otherwise.
