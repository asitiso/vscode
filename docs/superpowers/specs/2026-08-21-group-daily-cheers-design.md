# Daily Anonymous Group Cheers — Design

Date: 2026-08-21
Repository: `asitiso/vscode`
Base branch: `feature/group-weekly-awards-20260821`
Feature branch: `feature/group-daily-cheers-20260821`

## 1. Goal

Add a lightweight social interaction to workout groups so members can encourage each other without introducing chat, free-form text, social-pressure-heavy sender lists, XP, rewards, or long-lived social history.

The feature is deliberately daily and anonymous:

- a member can send one cheer per target member per group per Korea-local calendar day;
- changing the cheer type replaces that day's choice rather than adding another vote;
- the receiver sees only aggregate counts by cheer type;
- the sender may see only their own current selection for that receiver;
- no UI exposes who sent any cheer;
- cheers do not affect cooperative quests, MVP, weekly awards, saves, XP, or workout calculations.

## 2. Cheer Types

V1 has exactly three fixed values:

- `fire` — 🔥 불붙여!
- `clap` — 👏 잘한다!
- `together` — 💪 같이가자!

No custom text, comments, reactions beyond these three values, or user-created reaction types are in scope.

## 3. Daily Boundary

A cheer day is determined by the database server using Korea time, not by a client-supplied date.

Conceptually:

```sql
(timezone('Asia/Seoul', now()))::date
```

Clients never send `cheer_date`. This prevents clients from writing historical/future cheers by manipulating their device clock or request payload.

There is no destructive midnight reset job. Rows remain historical database records, but all V1 reads and writes operate only on the server-derived current Korea-local date. Therefore the product behaves as if cheers reset at midnight without requiring cron or cleanup logic.

## 4. Persistence Model

Add a table conceptually named `group_daily_cheers` with these fields:

- `group_id uuid` → `groups(id)` with cascade delete
- `sender_id uuid` → `auth.users(id)` with cascade delete
- `receiver_id uuid` → `auth.users(id)` with cascade delete
- `cheer_date date`
- `cheer_type text` constrained to `fire | clap | together`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary/unique identity:

```text
(group_id, sender_id, receiver_id, cheer_date)
```

This enforces one row per sender → receiver → group → day.

A sender pressing another cheer type on the same target/day updates only `cheer_type` and `updated_at` for the existing row.

Self-cheering is forbidden.

## 5. Authorization and Privacy Model

### 5.1 Direct table access

The browser should not receive raw `group_daily_cheers` rows because those rows contain `sender_id` and would defeat anonymity.

Therefore V1 does not grant authenticated clients normal direct `SELECT`, `INSERT`, `UPDATE`, or `DELETE` access to the table. The client interacts through narrowly-scoped RPC functions only.

RLS remains enabled as defense in depth even though direct table privileges are withheld.

### 5.2 Write RPC

Expose a narrow RPC conceptually named `send_group_daily_cheer(group_id, receiver_id, cheer_type)`.

Server-side validation must verify:

1. `auth.uid()` exists;
2. the cheer type is one of the three fixed values;
3. sender and receiver are different users;
4. sender is currently a member of `group_id`;
5. receiver is currently a member of the same `group_id`;
6. the row date is computed on the server in `Asia/Seoul`;
7. insert-or-update uses the unique daily identity above.

After the upsert, the function returns the same minimal anonymous summary shape as the read RPC for that receiver: three counts plus the caller's own selected type. This makes a send a single client round trip and never returns another sender's identity.

### 5.3 Read RPC

Expose a narrow RPC conceptually named `get_group_daily_cheer_summary(group_id, receiver_id)`.

Server-side validation verifies the requesting user is a current member of `group_id` and the receiver is also a current member.

The response contains only:

- count of `fire` cheers today;
- count of `clap` cheers today;
- count of `together` cheers today;
- the requesting user's own selected cheer for that receiver today, or null.

For the receiver viewing their own modal, `my_selection` is null and the UI does not render send buttons.

The response never includes sender IDs, sender nicknames, timestamps for individual cheers, or raw rows.

### 5.4 Privileged function safety

If a `SECURITY DEFINER` function is required to aggregate or mutate the private table while direct table privileges remain revoked, it must:

- perform explicit `auth.uid()` and group-membership checks in the function body;
- use a fixed safe `search_path`;
- revoke default `PUBLIC` execution;
- explicitly grant execution only to `authenticated`;
- avoid accepting sender IDs or dates from the client;
- expose only the minimal aggregate/selection result described above.

This is a deliberate narrow exception to normal invoker behavior because raw sender-bearing rows must stay inaccessible to the browser.

## 6. Client API

Add small typed group API helpers, conceptually:

```ts
type GroupCheerType = 'fire' | 'clap' | 'together';

interface GroupCheerSummary {
  fire: number;
  clap: number;
  together: number;
  mySelection: GroupCheerType | null;
}

loadGroupDailyCheerSummary(groupId, receiverId): Promise<GroupCheerSummary>
sendGroupDailyCheer(groupId, receiverId, type): Promise<GroupCheerSummary>
```

Both RPCs map to the same normalized summary shape. A successful send returns the post-update summary directly, so the UI does not need an immediate second request. Raw cheer rows never enter application state.

Errors map into the existing group error style where possible. No new global state store is required.

## 7. Member Detail Modal UX

The existing `GroupMemberDetailModal` is the interaction surface.

Below workout stats and privacy copy, add a compact section:

```text
오늘 받은 응원
🔥 2   👏 1   💪 3
```

When viewing another member:

```text
응원 보내기
[🔥 불붙여!] [👏 잘한다!] [💪 같이가자!]
```

Behavior:

- load today's aggregate summary when the modal opens;
- show a small loading state without blocking the rest of the modal;
- pressing a cheer sends the request and, on success, replaces local state with the returned post-update summary;
- changing to another button replaces today's selection;
- pressing the already-selected button keeps it selected rather than toggling it off;
- on request failure, preserve the prior confirmed state and show a small inline error;
- self modal shows aggregate counts only and hides the send controls;
- no sender names are shown anywhere.

## 8. Interaction and Accessibility

- Each cheer button has visible text plus emoji; meaning is not color-only.
- Selected state uses both styling and `aria-pressed=true`.
- Buttons remain large enough for mobile touch targets.
- Sending disables the three cheer buttons briefly to avoid duplicate concurrent requests.
- No flashing, confetti, or aggressive animation is required.
- A short success copy such as `오늘의 응원을 보냈어요` may appear inline; no toast framework is introduced solely for this feature.

## 9. Refresh Semantics

The group detail screen already refreshes group activity periodically, but cheer state is scoped to the open member modal.

V1 refresh rules:

- fetch summary on modal open;
- use the send RPC's returned summary after a send;
- closing/reopening the modal fetches fresh values;
- no Realtime subscription or polling loop is added for cheers.

This keeps the feature cheap and avoids unnecessary live subscription complexity.

## 10. Out of Scope

V1 explicitly excludes:

- push notifications;
- Supabase Realtime subscriptions;
- sender identity/history;
- free-form messages;
- cancel/remove-cheer action;
- weekly/all-time cheer totals in the UI;
- leaderboard or awards based on cheers;
- XP, packs, cards, items, achievements, or rewards from cheers;
- changes to cooperative quest, MVP, or weekly awards scoring;
- moderation/reporting tools, because no user-generated text exists.

## 11. Migration Strategy

Create a new migration using the repository's Supabase migration workflow rather than editing the original 2026-08-18 group migration.

The migration will contain only the new cheer table, constraints/indexes, RLS posture, RPC functions, privilege revocations/grants, and any narrowly required helper objects.

Before implementation, current Supabase changelog/docs must be checked for relevant Auth/RLS/PostgREST RPC changes. Before considering the database work complete, schema behavior and permissions must be verified against an available Supabase test environment or equivalent database execution path, and security advisors should be run when available.

## 12. Test Strategy

### Database / contract behavior

Verify at minimum:

- unauthenticated caller is rejected;
- non-group member cannot read or send;
- sender cannot cheer themselves;
- receiver must be a member of the specified group;
- invalid cheer type is rejected;
- first cheer inserts one daily row;
- changing type updates the same row instead of inserting a second row;
- next Korea-local date produces a new daily identity;
- summary returns correct type counts;
- send returns the updated summary in one RPC round trip;
- summary exposes only caller's own selection, never sender identities;
- direct raw-table access from normal authenticated client privileges is unavailable.

### TypeScript API

Verify:

- RPC payload mapping;
- numeric count normalization;
- nullable own selection handling;
- send/read helpers both normalize the same response contract;
- group error propagation.

### UI

Verify:

- aggregate counts render;
- self modal hides send controls;
- other-member modal shows three controls;
- selected button uses `aria-pressed`;
- send replaces selected type rather than accumulating a local second vote;
- sending state prevents concurrent presses;
- request failure retains confirmed state and surfaces an inline error.

### Regression

Run the existing full test suite, TypeScript build/typecheck, production build, and lint. Existing group quests, MVP, weekly awards, group management, live status, and workout recording must remain unchanged.

## 13. Success Criteria

The feature is successful when two members of the same group can use the existing member-detail flow to exchange a real server-backed daily cheer, the receiver can see anonymous daily aggregate counts, the sender can see only their own active selection, the selection can be changed but not multiplied within the same Korea-local day, and no client-accessible path reveals who sent another member's cheer.
