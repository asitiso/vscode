# Workout Flow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운동 세션 연동, HUD 상세 디자인 통일, 홈 중앙 레이아웃 정리, 운동 완료 보상 피드백을 순서대로 완성한다.

**Architecture:** 기존 `useWorkoutSessionTimer`를 공용 세션 소스로 유지하고 최근 종료 세션만 별도 localStorage에 보존한다. RecordScreen은 실행 중/방금 종료 상태를 모두 표현하며 운동 로그에는 optional `durationSeconds`를 기록한다. HUD 팝업은 공통 CSS primitive를 공유하고, 완료 피드백은 RecordScreen 위 독립 컴포넌트로 표시한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite

**Spec:** `docs/superpowers/specs/2026-08-19-workout-flow-polish-design.md`

## Global Constraints
- 기존 로컬/계정 저장 형식은 하위 호환을 유지한다.
- 원격 그룹 세션 실패가 로컬 운동 기록을 막지 않는다.
- 기존 카드팩 지급/XP/주간 목표 규칙을 변경하지 않는다.
- 모든 동작 변경은 테스트를 먼저 작성하고 RED→GREEN 순서로 진행한다.

---

### Task 1: Record session continuity

**Files:**
- Modify: `src/hooks/useWorkoutSessionTimer.ts`
- Modify: `src/hooks/useWorkoutSessionTimer.test.ts`
- Modify: `src/types/index.ts`
- Modify: `src/store/GameContext.tsx`
- Create: `src/store/workoutDurationReducer.test.ts`
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordSessionTimer.css`
- Create: `src/screens/RecordSessionState.test.tsx`

**Interfaces:**
- `useWorkoutSessionTimer()` produces `lastCompletedSeconds`, `stop(): Promise<number>`, `discardCompleted(): void` in addition to existing fields.
- `GameContextValue.completeWorkout(entries, feeling, memo?, durationSeconds?)` stores optional `WorkoutLog.durationSeconds`.

- [ ] Step 1: Extend hook tests to require persistence of the elapsed seconds after `stop()`, same-day restoration, clearing on `start()`, and explicit discard.
- [ ] Step 2: Run focused timer tests and verify RED.
- [ ] Step 3: Implement recent-completed-session persistence and `stop(): Promise<number>` without changing remote synchronization behavior.
- [ ] Step 4: Add reducer/type tests requiring optional `durationSeconds` to be copied into new workout logs; run RED.
- [ ] Step 5: Extend `WorkoutLog`, `COMPLETE_WORKOUT`, and `completeWorkout` with optional duration; run reducer test GREEN.
- [ ] Step 6: Add RecordScreen tests requiring running time continuity and completed-session summary; run RED.
- [ ] Step 7: Update RecordScreen timer states and completion/cancel handling; run focused tests GREEN.

### Task 2: Shared HUD popover visual system

**Files:**
- Create: `src/screens/HomeHudPopover.css`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeLevelXp.css`
- Modify: `src/screens/HomeWeeklyGoalControl.tsx`
- Modify: `src/screens/HomeWeeklyGoalControl.css`
- Create: `src/screens/HomeHudPopover.layout.test.ts`

**Interfaces:**
- Shared classes: `home-hud-popover`, `home-hud-popover--left`, `home-hud-popover--right`, plus common heading/progress geometry.

- [ ] Step 1: Add layout test requiring both level and weekly popovers to use the shared primitive; run RED.
- [ ] Step 2: Add common popover CSS and attach shared classes while retaining theme colors; run GREEN.
- [ ] Step 3: Verify mutual exclusion, outside-click, Escape behavior remains unchanged.

### Task 3: Home center visual balance

**Files:**
- Modify: `src/screens/CardSetProgress.css`
- Modify: `src/screens/HomeScreen.hudLayout.test.ts`

**Interfaces:**
- Home center positions remain absolute but use a consistent default and compact-height scale.

- [ ] Step 1: Tighten layout test for set-progress/CTA/character spacing and compact-height overrides; run RED.
- [ ] Step 2: Apply the final spacing values so no removed-panel gap remains and no center controls collide; run GREEN.

### Task 4: Workout completion feedback

**Files:**
- Create: `src/screens/WorkoutCompletionFeedback.tsx`
- Create: `src/screens/WorkoutCompletionFeedback.css`
- Create: `src/screens/WorkoutCompletionFeedback.test.tsx`
- Create: `src/game/workoutCompletionSummary.ts`
- Create: `src/game/workoutCompletionSummary.test.ts`
- Modify: `src/screens/RecordScreen.tsx`

**Interfaces:**
- `buildWorkoutCompletionSummary(...)` returns duration, XP gain, next weekly count, remaining weekly count, goal-completed flag, and `packCount: 1`.
- `WorkoutCompletionFeedback` renders the summary and calls `onDone` only when the user chooses `홈으로`.

- [ ] Step 1: Add summary tests for base workout XP, personal-best bonus, and first weekly-goal completion bonus; run RED.
- [ ] Step 2: Implement pure summary builder; run GREEN.
- [ ] Step 3: Add component test for duration, XP, weekly progress, card pack, and delayed home navigation; run RED.
- [ ] Step 4: Implement feedback component and wire it into RecordScreen after successful `completeWorkout`; run GREEN.
- [ ] Step 5: Run full `npm test` and `npm run build`; only claim completion if both pass.
