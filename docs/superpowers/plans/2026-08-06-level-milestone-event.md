# Level Milestone Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-time milestone events at levels 10, 20, 30, and every later multiple of 10, granting a special card pack, a profile badge, and a stored cosmetic unlock without changing existing workout, collection, or cloud-save behavior.

**Architecture:** Keep milestone rules in a new pure `levelMilestones` module, persist claimed rewards in `AppState`, and perform reward claiming atomically in `GameContext` through one reducer action. `HomeScreen` detects the lowest unclaimed milestone from the calculated experience level, opens a focused modal, and reuses the existing pack-opening route for the granted milestone pack.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 3, Testing Library, existing reducer/localStorage/Supabase save architecture.

## Global Constraints

- Trigger only for levels 10 and above that are exact multiples of 10.
- Each milestone reward may be claimed only once per saved game state.
- Use calculated experience level, not stale persisted `user.level`, for eligibility.
- Grant the milestone pack, badge, cosmetic, and claim record atomically in one reducer action.
- Existing saved states must normalize missing milestone arrays to empty arrays.
- Milestone packs must not change the legendary pity counter.
- Reuse the existing pack-opening flow; do not create a second card-opening system.
- Do not add new image assets in this implementation.
- Do not merge a pull request unless the user explicitly asks.
- Report test or build success only after the command has actually completed successfully.

---

## File Structure

**Create**
- `src/game/levelMilestones.ts` — pure milestone eligibility, badge, cosmetic, dialogue, and highest-badge helpers.
- `src/game/levelMilestones.test.ts` — unit tests for milestone rules.
- `src/screens/LevelMilestoneModal.tsx` — milestone celebration and reward claim interface.
- `src/screens/LevelMilestoneModal.css` — mobile modal layout, CSS gift box, reduced-motion handling.
- `src/screens/LevelMilestoneModal.test.tsx` — modal interaction and accessibility tests.
- `src/store/levelMilestoneReducer.test.ts` — reducer-level reward and duplicate-prevention tests, using an exported reducer helper.

**Modify**
- `src/types/index.ts` — milestone state arrays, `level-milestone` pack source, and source level metadata.
- `src/store/storage.ts` — initial values and backward-compatible normalization.
- `src/store/storage.test.ts` — migration coverage for existing saves.
- `src/data/packs.ts` — add `pack-level-milestone` definition using an existing pack asset.
- `src/game/cardDraw.ts` — support milestone rarity distribution without pity mutation.
- `src/game/cardDraw.test.ts` — milestone draw distribution constraints.
- `src/store/GameContext.tsx` — claim action, exported reducer helper, context method, and no-op guards.
- `src/screens/HomeScreen.tsx` — detect pending milestone, display badge, open modal, navigate to granted pack.
- `src/screens/HomeScreen.css` or `src/screens/HomeLevelXp.css` — compact badge styling beside the level indicator.
- `src/screens/HomeScreen.test.tsx` — pending-event and badge rendering coverage if an existing test harness is present; otherwise create it.

---

### Task 1: Define and test milestone rules

**Files:**
- Create: `src/game/levelMilestones.ts`
- Create: `src/game/levelMilestones.test.ts`

**Interfaces:**
- Produces: `isLevelMilestone(level: number): boolean`
- Produces: `getPendingLevelMilestone(currentLevel: number, claimed: readonly number[]): number | null`
- Produces: `getMilestoneBadge(level: number): { id: string; label: string }`
- Produces: `getMilestoneCosmetic(level: number): { id: string; label: string }`
- Produces: `getMilestoneDialogue(level: number, characterName?: string): string`
- Produces: `getHighestEarnedMilestoneBadge(claimed: readonly number[]): { id: string; label: string; level: number } | null`

- [ ] **Step 1: Write failing milestone tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  getHighestEarnedMilestoneBadge,
  getMilestoneBadge,
  getMilestoneCosmetic,
  getPendingLevelMilestone,
  isLevelMilestone,
} from './levelMilestones';

describe('level milestones', () => {
  it('accepts only positive multiples of ten from level 10', () => {
    expect(isLevelMilestone(9)).toBe(false);
    expect(isLevelMilestone(10)).toBe(true);
    expect(isLevelMilestone(20)).toBe(true);
    expect(isLevelMilestone(25)).toBe(false);
  });

  it('returns the lowest unclaimed milestone at or below the current level', () => {
    expect(getPendingLevelMilestone(9, [])).toBeNull();
    expect(getPendingLevelMilestone(30, [10])).toBe(20);
    expect(getPendingLevelMilestone(30, [10, 20, 30])).toBeNull();
  });

  it('returns stable configured and generated rewards', () => {
    expect(getMilestoneBadge(10)).toEqual({ id: 'level-10-explorer', label: 'Explorer' });
    expect(getMilestoneCosmetic(50)).toEqual({ id: 'crown', label: '왕관' });
    expect(getMilestoneBadge(60)).toEqual({ id: 'level-60-milestone', label: 'Lv.60 Milestone' });
    expect(getMilestoneCosmetic(60)).toEqual({ id: 'milestone-60', label: 'Lv.60 장식' });
  });

  it('returns the highest earned badge', () => {
    expect(getHighestEarnedMilestoneBadge([])).toBeNull();
    expect(getHighestEarnedMilestoneBadge([10, 30, 20])).toMatchObject({ level: 30, label: 'Elite' });
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- src/game/levelMilestones.test.ts
```

Expected: FAIL because `levelMilestones.ts` does not exist.

- [ ] **Step 3: Implement the pure milestone module**

Use fixed tables for levels 10–50 and generated IDs/labels from level 60 onward. `getPendingLevelMilestone` must iterate from 10 upward in increments of 10 and return the first level not contained in a `Set` of claimed levels.

```ts
const BADGES = {
  10: { id: 'level-10-explorer', label: 'Explorer' },
  20: { id: 'level-20-challenger', label: 'Challenger' },
  30: { id: 'level-30-elite', label: 'Elite' },
  40: { id: 'level-40-master', label: 'Master' },
  50: { id: 'level-50-legend', label: 'Legend' },
} as const;
```

Cosmetic labels must be `스포츠 헤드밴드`, `메달`, `망토`, `황금 오라`, and `왕관` for levels 10–50.

- [ ] **Step 4: Run the focused test and verify pass**

```bash
npm test -- src/game/levelMilestones.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/levelMilestones.ts src/game/levelMilestones.test.ts
git commit -m "feat: add level milestone rules"
```

---

### Task 2: Extend state types and migrate existing saves

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Extends `AppState` with `claimedLevelMilestones`, `earnedBadges`, and `unlockedCosmetics` string/number arrays.
- Extends `PackSource` with `'level-milestone'`.
- Extends `GrantedPack` with optional `sourceMilestoneLevel?: number`.

- [ ] **Step 1: Add failing migration tests**

Add tests that normalize a legacy state without the three arrays and assert empty arrays, plus a round-trip test preserving populated milestone data.

```ts
expect(normalized.claimedLevelMilestones).toEqual([]);
expect(normalized.earnedBadges).toEqual([]);
expect(normalized.unlockedCosmetics).toEqual([]);
```

- [ ] **Step 2: Run the storage tests and verify failure**

```bash
npm test -- src/store/storage.test.ts
```

Expected: FAIL because normalized states do not contain milestone fields.

- [ ] **Step 3: Extend the TypeScript types**

Add:

```ts
export type PackSource = 'workout' | 'set-completion' | 'level-milestone';
```

and to `GrantedPack`:

```ts
sourceMilestoneLevel?: number;
```

and to `AppState`:

```ts
claimedLevelMilestones: number[];
earnedBadges: string[];
unlockedCosmetics: string[];
```

- [ ] **Step 4: Normalize old state and initialize new state**

In `migrateState`, set missing arrays to `[]`. Preserve `source: 'level-milestone'` instead of coercing it to `workout`. Add empty arrays to `createInitialState`.

- [ ] **Step 5: Run storage tests and type-check build**

```bash
npm test -- src/store/storage.test.ts
npm run build
```

Expected: tests PASS and build PASS. If build reveals required state fixtures elsewhere, update only those fixtures with empty milestone arrays.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: persist level milestone rewards"
```

---

### Task 3: Add the milestone pack and draw rules

**Files:**
- Modify: `src/data/packs.ts`
- Modify: `src/game/cardDraw.ts`
- Modify: `src/game/cardDraw.test.ts`

**Interfaces:**
- Produces pack definition ID: `pack-level-milestone`
- Extends the existing draw options with `milestone?: boolean`
- Milestone draw returns only `rare`, `super-rare`, or `legendary` using 0.75 / 0.20 / 0.05.
- Milestone draw result must not independently alter pity; `GameContext` will preserve the current pity counter.

- [ ] **Step 1: Write failing draw tests**

Mock `Math.random` at boundary values and assert milestone rarity selection:

```ts
expect(drawCard([], 12, { milestone: true }, () => 0.10).card.rarity).toBe('rare');
expect(drawCard([], 12, { milestone: true }, () => 0.80).card.rarity).toBe('super-rare');
expect(drawCard([], 12, { milestone: true }, () => 0.99).card.rarity).toBe('legendary');
```

Adapt to the existing random-injection signature; if none exists, add an optional final `random: () => number = Math.random` parameter and update current callers without behavior changes.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- src/game/cardDraw.test.ts
```

Expected: FAIL because milestone draw mode is unsupported.

- [ ] **Step 3: Add the pack definition**

Add `pack-level-milestone` using an existing special-looking pack asset and no favored category restriction. Do not add image files.

- [ ] **Step 4: Implement milestone rarity selection**

Use a dedicated constant:

```ts
const LEVEL_MILESTONE_DROP_RATE = {
  rare: 0.75,
  'super-rare': 0.20,
  legendary: 0.05,
} as const;
```

Select rarity before category weighting, then choose a card from that rarity using the existing candidate logic.

- [ ] **Step 5: Run card draw tests and the full test suite**

```bash
npm test -- src/game/cardDraw.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/packs.ts src/game/cardDraw.ts src/game/cardDraw.test.ts
git commit -m "feat: add milestone reward pack"
```

---

### Task 4: Claim milestone rewards atomically in the reducer

**Files:**
- Modify: `src/store/GameContext.tsx`
- Create: `src/store/levelMilestoneReducer.test.ts`

**Interfaces:**
- Adds action: `{ type: 'CLAIM_LEVEL_MILESTONE'; level: number; currentLevel: number }`
- Exports reducer for focused tests as `export function gameReducer(state: AppState, action: Action): AppState`
- Adds context method: `claimLevelMilestone(level: number, currentLevel: number): GrantedPack | null` or, if dispatch cannot synchronously return the pack, `claimLevelMilestone(level: number, currentLevel: number): void` and locate the resulting pack by `sourceMilestoneLevel` in state after render.
- Recommended implementation: deterministic pack ID `level-milestone-${level}` to make navigation and duplicate tests straightforward.

- [ ] **Step 1: Write failing reducer tests**

Create state with current calculated level supplied as 10, claim level 10, then assert:

```ts
expect(next.claimedLevelMilestones).toEqual([10]);
expect(next.earnedBadges).toContain('level-10-explorer');
expect(next.unlockedCosmetics).toContain('sports-headband');
expect(next.grantedPacks).toContainEqual(expect.objectContaining({
  id: 'level-milestone-10',
  packDefId: 'pack-level-milestone',
  source: 'level-milestone',
  sourceMilestoneLevel: 10,
}));
```

Also assert duplicate, non-multiple-of-10, below-10, and above-current-level requests return the exact same state object.

- [ ] **Step 2: Run reducer test and verify failure**

```bash
npm test -- src/store/levelMilestoneReducer.test.ts
```

Expected: FAIL because the action and exported reducer are missing.

- [ ] **Step 3: Implement the guarded reducer action**

Validation order:

1. `isLevelMilestone(action.level)`
2. `action.level <= action.currentLevel`
3. not already in `claimedLevelMilestones`
4. milestone pack definition exists

Return one new state containing all reward changes. Use `Set`-based de-duplication for badge and cosmetic arrays.

- [ ] **Step 4: Preserve pity during milestone pack opening**

In `OPEN_PACK`, pass `{ milestone: pack.source === 'level-milestone', ... }` into `drawCard`. When source is `level-milestone`, leave `state.user.legendaryPityCounter` unchanged regardless of result. Preserve existing behavior for every other pack source.

- [ ] **Step 5: Expose the claim method through context**

Add `claimLevelMilestone` to `GameContextValue` and dispatch the new action. Keep current context consumers source-compatible.

- [ ] **Step 6: Run reducer and full tests**

```bash
npm test -- src/store/levelMilestoneReducer.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/GameContext.tsx src/store/levelMilestoneReducer.test.ts
git commit -m "feat: claim level milestone rewards"
```

---

### Task 5: Build the accessible milestone modal

**Files:**
- Create: `src/screens/LevelMilestoneModal.tsx`
- Create: `src/screens/LevelMilestoneModal.css`
- Create: `src/screens/LevelMilestoneModal.test.tsx`

**Interfaces:**

```ts
interface LevelMilestoneModalProps {
  level: number;
  claimed: boolean;
  characterName?: string;
  onClaim: () => void;
  onOpenPack: () => void;
  onClose: () => void;
}
```

- [ ] **Step 1: Write failing UI tests**

Test that the modal:
- has `role="dialog"` and `aria-modal="true"`
- displays `Lv.10 달성!`, badge, cosmetic, and special pack
- calls `onClaim` once even when the claim button is rapidly clicked
- after `claimed=true`, shows `특별 카드팩 열기` and calls `onOpenPack`
- closes on Escape without claiming

- [ ] **Step 2: Run the modal test and verify failure**

```bash
npm test -- src/screens/LevelMilestoneModal.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement modal behavior**

Use `useRef` to prevent repeated click dispatch before the parent re-renders. Lock `document.body.style.overflow = 'hidden'` while mounted and restore the prior value on cleanup. Attach an Escape listener and focus the primary action button on mount.

- [ ] **Step 4: Implement CSS-only celebration styling**

Include:
- full-screen dim overlay
- gold/purple centered panel
- CSS gift box made from div/span elements
- short entry and reward-list animations
- `@media (prefers-reduced-motion: reduce)` disabling transforms and animations
- safe mobile width and scroll handling for small screens

Do not add image assets or continuous particle animation.

- [ ] **Step 5: Run modal tests and build**

```bash
npm test -- src/screens/LevelMilestoneModal.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LevelMilestoneModal.tsx src/screens/LevelMilestoneModal.css src/screens/LevelMilestoneModal.test.tsx
git commit -m "feat: add level milestone celebration modal"
```

---

### Task 6: Connect milestone detection, reward flow, and home badge

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css` or `src/screens/HomeLevelXp.css`
- Create or modify: `src/screens/HomeScreen.test.tsx`

**Interfaces:**
- Consumes `calculateExperienceProgress(state).level` from the corrected experience module. If `ExperienceProgress` does not yet expose `level`, add it there with tests rather than deriving a second level formula in `HomeScreen`.
- Consumes `getPendingLevelMilestone` and `getHighestEarnedMilestoneBadge`.
- Consumes `claimLevelMilestone` from context.
- Navigates with `onNavigate('pack-opening', { packId: 'level-milestone-10' })` after claim.

- [ ] **Step 1: Add failing experience-level exposure test if needed**

If `calculateExperienceProgress` does not return calculated `level`, add an assertion in `src/game/experience.test.ts` that accumulated XP returns the expected level, and add `level` to `ExperienceProgress`. Do not rely on `state.user.level` in the home event detector.

- [ ] **Step 2: Add failing HomeScreen tests**

Render with calculated level 10 and no claims; assert the modal opens. Render with claim 10 recorded; assert it does not reopen. Render with `[10, 20]`; assert the `Challenger` badge is shown beside the level control.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
npm test -- src/game/experience.test.ts src/screens/HomeScreen.test.tsx
```

Expected: FAIL until the connection is implemented.

- [ ] **Step 4: Connect pending milestone detection**

Calculate:

```ts
const pendingMilestone = getPendingLevelMilestone(
  experience.level,
  state.claimedLevelMilestones,
);
```

Render `LevelMilestoneModal` when not null. Closing before claim only hides it for the current HomeScreen mount; navigating away and returning may show it again. Do not mark it claimed on close.

- [ ] **Step 5: Connect claim and pack navigation**

On claim, dispatch once using the calculated level. Confirm the resulting deterministic pack exists in updated state, then render the claimed state. `onOpenPack` navigates to the existing pack-opening screen using `level-milestone-${pendingMilestone}`.

- [ ] **Step 6: Display the highest badge**

Place a compact badge text next to `Lv.{experience.level}`. Keep the existing username subtitle. Hide the badge entirely when none has been earned.

- [ ] **Step 7: Run focused tests, full tests, lint, and build**

```bash
npm test -- src/game/experience.test.ts src/screens/HomeScreen.test.tsx
npm test
npm run lint
npm run build
```

Expected: all commands PASS. Record exact failures rather than claiming success if Vercel or local limits prevent execution.

- [ ] **Step 8: Commit**

```bash
git add src/game/experience.ts src/game/experience.test.ts src/screens/HomeScreen.tsx src/screens/HomeScreen.css src/screens/HomeLevelXp.css src/screens/HomeScreen.test.tsx
git commit -m "feat: connect level milestone events to home"
```

---

### Task 7: Verify backward compatibility and deployment readiness

**Files:**
- Modify only files required by verified failures.

**Interfaces:**
- No new public interfaces.

- [ ] **Step 1: Run the complete verification suite**

```bash
npm test
npm run lint
npm run build
```

Expected: PASS for all three.

- [ ] **Step 2: Manually verify critical flows in the preview**

Use a controlled localStorage state or test helper to verify:
- level 9: no event
- level 10, unclaimed: event appears
- close before claim: no reward, event returns after re-entering home
- claim: one pack, one badge, one cosmetic, one claimed level
- repeated clicks/reload: no duplicate reward
- level 30 with only level 10 claimed: level 20 appears first
- milestone pack opening: rare or higher and pity counter unchanged
- cloud save and restore preserve milestone arrays

- [ ] **Step 3: Review the diff for unintended scope changes**

```bash
git diff <backup-branch>...HEAD -- src
```

Confirm no workout logging, regular pack rates, collection completion, or unrelated screen layout changed.

- [ ] **Step 4: Commit verified corrective changes only if needed**

```bash
git add <only-files-fixed-after-verification>
git commit -m "fix: stabilize level milestone event flow"
```

Skip this commit when no corrections are needed.

- [ ] **Step 5: Push and inspect deployment status**

Push the implementation branch, inspect GitHub status checks and Vercel deployment state, and report `READY` only if Vercel actually completes. If the account build-rate limit blocks deployment, report the code and local verification separately from deployment status.
