# Reward Events V6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-pack combo opening, star-evolution celebrations, category collection completion, and an aggregate session summary without changing reward odds or persistent state.

**Architecture:** Keep the existing `PackOpeningScreen` as the orchestrator, but move combo/session/category calculations into a pure `rewardCombo.ts` helper. The screen snapshots the unopened pack ids on entry, opens one pack at a time with the existing `openPack` action, stores only temporary session results in component state, and renders V6-only phases with a dedicated stylesheet.

**Tech Stack:** React 19, TypeScript 6, CSS animations, existing Context reducer, Web Audio API helper.

## Global Constraints

- Do not change card probabilities, pity logic, or pack reward count.
- Do not add fields to `AppState` or server persistence.
- Every pack must still be granted through the existing `openPack(packId)` action exactly once.
- One unopened pack must preserve the current single-pack experience.
- Reduced-motion and sound-off preferences must remain supported.

---

### Task 1: Pure combo and category helpers

**Files:**
- Create: `src/game/rewardCombo.ts`

**Interfaces:**
- Produces `ComboResultItem`, `getComboPresentation`, `summarizeComboResults`, and `getCompletedCategoryForCard`.

- [ ] Define combo result and summary types using existing `CardRarity`, `CardDefinition`, `Exercise`, and `OwnedCard` types.
- [ ] Implement combo labels for 1, 2, 3, and 4+ openings.
- [ ] Implement aggregate counts and highest-rarity selection.
- [ ] Implement category completion by comparing before/after ownership for the newly acquired card.
- [ ] Commit with `feat: add reward combo calculations`.

### Task 2: Multi-pack orchestration and celebration phases

**Files:**
- Modify: `src/screens/PackOpeningScreen.tsx`

**Interfaces:**
- Consumes helpers from Task 1 and existing `openPack`, `state.grantedPacks`, card/exercise definitions.
- Produces uninterrupted multi-pack flow and temporary session results.

- [ ] Snapshot current unopened pack ids with the requested pack first.
- [ ] Add `currentPackId`, session result list, combo transition, evolution, category-complete, and session-summary phases.
- [ ] Reset the existing 1–5 phase local state when moving to the next pack without calling `onDone`.
- [ ] Capture each result after `openPack` updates state, with duplicate/new/star/evolution/category metadata.
- [ ] Insert 2-star, 3-star, and final 4-star evolution celebrations.
- [ ] Insert category completion celebration only when before < 100% and after = 100%.
- [ ] Show `다음 팩 개봉` when queued packs remain and session summary after the final pack.
- [ ] Ensure exiting early leaves unopened queued packs untouched.
- [ ] Commit with `feat: add combo pack opening flow`.

### Task 3: V6 visuals and audio accents

**Files:**
- Create: `src/screens/RewardEventsV6.css`
- Modify: `src/screens/PackOpeningScreen.tsx`
- Modify: `src/game/rewardAudio.ts`

**Interfaces:**
- Adds V6 CSS classes and optional `combo` / `evolution` sound cues.

- [ ] Add combo header, progress meter, transition overlay, and max-combo edge pulse.
- [ ] Add distinct 2-star, 3-star, and 4-star evolution layouts.
- [ ] Add category completion grid and aggregate session card strip.
- [ ] Add low-height mobile scrolling and reduced-motion overrides.
- [ ] Add lightweight combo/evolution sound variants while preserving existing calls.
- [ ] Commit with `feat: style combo evolution celebrations`.

### Task 4: Verification and PR

**Files:**
- Review all V6 changes.

- [ ] Run repository production build through the connected Vercel status check.
- [ ] Compare `feature/reward-events-v5` and `feature/reward-events-v6` to verify only intended files changed.
- [ ] Confirm no `AppState`, probability, or pity files changed.
- [ ] Open a PR from `feature/reward-events-v6` to `feature/reward-events-v5` with manual test cases.
