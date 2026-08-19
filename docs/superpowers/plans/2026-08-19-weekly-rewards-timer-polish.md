# Weekly Rewards and Timer Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make weekly goals/streaks correct, add a one-time weekly reward pack, expose unopened packs clearly on Home, and harden workout timer/completion transitions.

**Architecture:** Keep weekly date/reward rules in pure game helpers, keep reward creation in the reducer, and keep Home/Record components as presentation/navigation layers. Reuse the existing `pack-weekly-goal`, `unopenedPacks`, and `pack-opening` navigation rather than creating new reward subsystems.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-08-19-weekly-rewards-timer-polish-design.md`

## Global Constraints

- Same local day counts once toward the weekly goal.
- Week starts Monday; year-boundary calculations must be deterministic from `YYYY-MM-DD` keys.
- Weekly-goal reward pack is granted once per completed week.
- Existing workout pack reward remains unchanged.
- No branch merge.
- Use TDD for every behavior change.

---

### Task 1: Weekly goal and streak correctness

**Files:**
- Modify: `src/game/weeklyGoal.ts`
- Create: `src/game/weeklyGoal.test.ts`
- Modify: `src/game/experience.ts`
- Modify: `src/game/experience.test.ts`
- Modify: `src/game/workoutCompletionSummary.ts`
- Modify: `src/game/workoutCompletionSummary.test.ts`
- Modify: `src/screens/RecordScreen.tsx`

**Interfaces:**
- `countSessionsByWeek(logs)` continues returning unique active-day counts by week.
- `computeWeeklyProgress(logs, target, today)` returns `{sessionsThisWeek, remainingThisWeek, streak}` with current-week completion included in streak.
- `buildWorkoutCompletionSummary` gains `countsTowardWeeklyGoal: boolean` and only increments weekly progress when true.

- [ ] Write tests for same-day de-duplication, Monday reset, year boundary, streak preservation/break, and current-week completion.
- [ ] Verify the new tests fail against the current implementation.
- [ ] Implement local-date-safe week calculation and streak logic.
- [ ] Make weekly-goal XP use unique active days rather than raw log count.
- [ ] Make completion summary aware of same-day duplicate workouts and pass `!game.todayLogged` from RecordScreen.
- [ ] Run focused tests and commit.

### Task 2: Weekly-goal dedicated reward

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/GameContext.tsx`
- Create: `src/game/weeklyGoalReward.test.ts`
- Modify: `src/game/workoutCompletionSummary.ts`
- Modify: `src/game/workoutCompletionSummary.test.ts`
- Modify: `src/game/workoutCompletionPack.ts`
- Modify: `src/game/workoutCompletionPack.test.ts`
- Modify: `src/screens/WorkoutCompletionFeedback.tsx`
- Modify: `src/screens/WorkoutCompletionFeedback.test.tsx`
- Modify: `src/screens/RecordScreen.tsx`

**Interfaces:**
- Extend `PackSource` with `'weekly-goal'` and `GrantedPack` with optional `sourceWeekKey`.
- Reducer grants `pack-weekly-goal` only when a new active day first reaches the weekly target and no reward exists for that week.
- Completion summary exposes `weeklyRewardPackCount` and total `packCount`.
- Immediate-open helper prioritizes a newly granted weekly-goal pack, then the normal workout pack.

- [ ] Write failing reducer tests for first completion, same-day duplicate, and already-rewarded week.
- [ ] Implement one-time weekly pack creation.
- [ ] Write failing feedback/helper tests for the weekly reward and primary pack choice.
- [ ] Implement completion feedback and pack-selection changes.
- [ ] Run focused tests and commit.

### Task 3: Home unopened-pack entry point

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Create: `src/screens/HomeUnopenedPack.test.tsx` or extend an existing Home layout test.

**Interfaces:**
- Reuse `unopenedPacks` from `useGame()`.
- Existing Home pack button opens `unopenedPacks[0]` and visibly exposes total unopened count.
- Weekly-goal pack badge uses `WEEK`; set completion uses `SET`; level milestone uses `LV`; normal workout uses `NEW`.

- [ ] Write a failing source/component test for unopened count and source badge copy.
- [ ] Implement the count chip/label without adding a second competing Home entry point.
- [ ] Run focused tests and commit.

### Task 4: Timer and completion idempotency

**Files:**
- Modify: `src/hooks/useWorkoutSessionTimer.ts`
- Modify: `src/hooks/useWorkoutSessionTimer.test.ts`
- Modify: `src/screens/RecordScreen.tsx`
- Create or modify: `src/screens/RecordScreen.completionGuard.test.tsx`

**Interfaces:**
- `start()` and `stop()` serialize duplicate in-flight calls.
- Wall-clock `startedAt` remains the source of truth across refresh/background.
- Record completion has an in-flight guard before awaiting timer stop, preventing duplicate `completeWorkout` calls/rewards.

- [ ] Write failing tests for duplicate start, duplicate stop, refresh/background elapsed time, and completion double-tap protection.
- [ ] Implement minimal in-flight guards while preserving existing storage keys and public hook API.
- [ ] Run focused tests.
- [ ] Run full `npm test` and `npm run build` in a temporary verification workflow if Vercel remains rate-limited.
- [ ] Remove temporary verification files and commit cleanup.
