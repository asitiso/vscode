# Home Character Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home character react with a short animation and a context-aware randomized speech bubble when clicked.

**Architecture:** Keep game-state interpretation in a pure `characterDialogue` module, isolate timers and animation state in a `HomeCharacterInteraction` component, and let `HomeScreen` only build the dialogue context from existing `useGame()` values. No interaction result is persisted; each click computes a fresh message and animation in component memory.

**Tech Stack:** React 19, TypeScript 6, Vite 8, CSS animations, Vitest for deterministic unit tests.

## Global Constraints

- Preserve all existing character image assets and the selected-character storage behavior.
- Do not change `AppState`, user profile data, workout records, weekly-progress calculations, reward issuance, pack opening, or the level XP popover.
- Keep the existing home record button and unopened-pack button positions and behavior unchanged.
- Dialogue priority must be: unopened reward, exactly one weekly session remaining, weekly goal complete, today workout complete, streak at least one week, today workout not complete, fallback.
- Do not persist dialogue text, previous message, animation choice, or timers.
- Speech bubbles close automatically after 3,000 ms and immediately when clicked.
- Reaction animations last between 500 and 800 ms and restart from the beginning on rapid repeated clicks.
- Respect `prefers-reduced-motion: reduce` by replacing movement-heavy reactions with a short scale response.
- Character interaction must work with pointer, Enter, and Space through a native `button`.
- Support 375×667, 390×844, and 430×932 layouts without blocking the record or pack buttons.

---

## File Structure

- Create `src/game/characterDialogue.ts`: dialogue groups, priority resolution, deterministic message and animation selection helpers.
- Create `src/game/characterDialogue.test.ts`: unit tests for priority and repeat avoidance.
- Create `src/screens/HomeCharacterInteraction.tsx`: character button, message state, animation state, timer lifecycle, accessible speech bubble.
- Create `src/screens/HomeCharacterInteraction.css`: idle animation, five reaction animations, speech bubble, mobile and reduced-motion rules.
- Modify `src/screens/HomeScreen.tsx`: build `CharacterDialogueContext` and render `HomeCharacterInteraction`.
- Modify `src/screens/HomeScreen.css`: retain positioning but remove image-owned idle animation rules moved to the new component.
- Modify `package.json`: add `test` script and Vitest development dependency.

---

### Task 1: Add deterministic dialogue selection logic

**Files:**
- Create: `src/game/characterDialogue.ts`
- Create: `src/game/characterDialogue.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: primitive home-state values supplied by `HomeScreen`.
- Produces:
  - `CharacterDialogueContext`
  - `CharacterDialogueGroup`
  - `CharacterReaction`
  - `selectCharacterDialogue(context, previousMessage?, random?)`
  - `selectCharacterReaction(previousReaction?, random?)`

- [ ] **Step 1: Add Vitest test support**

Update `package.json` scripts and dev dependencies:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Keep every existing dependency and script unchanged apart from adding `test` and `vitest`.

- [ ] **Step 2: Write failing priority and repeat-avoidance tests**

Create `src/game/characterDialogue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  selectCharacterDialogue,
  selectCharacterReaction,
  type CharacterDialogueContext,
} from './characterDialogue';

const baseContext: CharacterDialogueContext = {
  hasUnopenedPack: false,
  remainingWeeklySessions: 3,
  weeklyGoalComplete: false,
  todayLogged: false,
  streak: 0,
};

describe('selectCharacterDialogue', () => {
  it('prioritizes an unopened reward above every other condition', () => {
    const message = selectCharacterDialogue({
      hasUnopenedPack: true,
      remainingWeeklySessions: 0,
      weeklyGoalComplete: true,
      todayLogged: true,
      streak: 8,
    }, undefined, () => 0);

    expect(message).toBe('저기 반짝이는 상자가 보여!');
  });

  it('prioritizes exactly one remaining session above completed workout and streak', () => {
    const message = selectCharacterDialogue({
      ...baseContext,
      remainingWeeklySessions: 1,
      todayLogged: true,
      streak: 3,
    }, undefined, () => 0);

    expect(message).toBe('한 번만 더 하면 주간 목표 달성이야!');
  });

  it('uses the weekly-complete group when the goal is complete', () => {
    const message = selectCharacterDialogue({
      ...baseContext,
      remainingWeeklySessions: 0,
      weeklyGoalComplete: true,
      todayLogged: true,
    }, undefined, () => 0);

    expect(message).toBe('이번 주 목표를 완성했어!');
  });

  it('uses completed-workout dialogue before streak dialogue', () => {
    const message = selectCharacterDialogue({
      ...baseContext,
      todayLogged: true,
      streak: 2,
    }, undefined, () => 0);

    expect(message).toBe('오늘도 해냈네! 정말 멋져!');
  });

  it('does not immediately repeat the previous message', () => {
    const message = selectCharacterDialogue(
      baseContext,
      '오늘은 어떤 운동을 해볼까?',
      () => 0,
    );

    expect(message).toBe('조금만 움직여도 충분해!');
  });
});

describe('selectCharacterReaction', () => {
  it('returns a reaction different from the previous reaction when possible', () => {
    expect(selectCharacterReaction('bounce', () => 0)).toBe('wiggle');
  });
});
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```bash
npm install
npm test -- src/game/characterDialogue.test.ts
```

Expected: FAIL because `characterDialogue.ts` and its exports do not exist.

- [ ] **Step 4: Implement the pure dialogue module**

Create `src/game/characterDialogue.ts` with these exact public types:

```ts
export type CharacterDialogueContext = {
  hasUnopenedPack: boolean;
  remainingWeeklySessions: number;
  weeklyGoalComplete: boolean;
  todayLogged: boolean;
  streak: number;
};

export type CharacterDialogueGroup =
  | 'unopened-pack'
  | 'weekly-one-left'
  | 'weekly-complete'
  | 'today-complete'
  | 'streak'
  | 'before-workout'
  | 'fallback';

export type CharacterReaction = 'bounce' | 'wiggle' | 'wave' | 'jump' | 'double-pop';
```

Define the approved Korean messages as immutable arrays. Add these helpers:

```ts
const FALLBACK_MESSAGE = '오늘도 함께해 줘서 고마워!';

export function resolveCharacterDialogueGroup(
  context: CharacterDialogueContext,
): CharacterDialogueGroup {
  if (context.hasUnopenedPack) return 'unopened-pack';
  if (context.remainingWeeklySessions === 1) return 'weekly-one-left';
  if (context.weeklyGoalComplete) return 'weekly-complete';
  if (context.todayLogged) return 'today-complete';
  if (context.streak >= 1) return 'streak';
  if (!context.todayLogged) return 'before-workout';
  return 'fallback';
}

function selectDifferentValue<T>(
  values: readonly T[],
  previous: T | undefined,
  random: () => number,
): T | undefined {
  const candidates = previous === undefined ? values : values.filter((value) => value !== previous);
  const pool = candidates.length > 0 ? candidates : values;
  if (pool.length === 0) return undefined;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}
```

Implement `selectCharacterDialogue` and `selectCharacterReaction` using `selectDifferentValue`, defaulting `random` to `Math.random`. Return `FALLBACK_MESSAGE` if a dialogue array is unexpectedly empty.

- [ ] **Step 5: Run dialogue tests**

Run:

```bash
npm test -- src/game/characterDialogue.test.ts
```

Expected: PASS for all dialogue and reaction tests.

- [ ] **Step 6: Commit dialogue logic**

```bash
git add package.json package-lock.json src/game/characterDialogue.ts src/game/characterDialogue.test.ts
git commit -m "feat: add contextual character dialogue selection"
```

---

### Task 2: Build the interactive character component

**Files:**
- Create: `src/screens/HomeCharacterInteraction.tsx`
- Create: `src/screens/HomeCharacterInteraction.css`

**Interfaces:**
- Consumes:
  - `assetName: string`
  - `dialogueContext: CharacterDialogueContext`
- Produces: a native character button and optional dismissible live-region speech bubble.

- [ ] **Step 1: Create the component state and timer lifecycle**

Create `src/screens/HomeCharacterInteraction.tsx` with this interface:

```ts
interface HomeCharacterInteractionProps {
  assetName: string;
  dialogueContext: CharacterDialogueContext;
}
```

Use these state values:

```ts
const [message, setMessage] = useState<string | null>(null);
const [reaction, setReaction] = useState<CharacterReaction | null>(null);
const previousMessageRef = useRef<string>();
const previousReactionRef = useRef<CharacterReaction>();
const closeTimerRef = useRef<number | null>(null);
const reactionTimerRef = useRef<number | null>(null);
const interactionIdRef = useRef(0);
```

Add `clearTimers()` that clears both refs and resets them to `null`. Call it from an unmount cleanup effect.

- [ ] **Step 2: Implement click handling and restart behavior**

Add a single `handleCharacterActivate()` function that:

1. Clears existing close and reaction timers.
2. Increments `interactionIdRef.current` to force the CSS animation wrapper to remount.
3. Calls `selectCharacterDialogue(dialogueContext, previousMessageRef.current)`.
4. Calls `selectCharacterReaction(previousReactionRef.current)`.
5. Stores the returned values in refs and state.
6. Starts a 700 ms timer that sets `reaction` to `null`.
7. Starts a 3,000 ms timer that sets `message` to `null`.

Use a native button:

```tsx
<button
  key={interactionIdRef.current}
  type="button"
  className={`home-character__button${reaction ? ` home-character__button--${reaction}` : ''}`}
  onClick={handleCharacterActivate}
  aria-label="캐릭터와 대화하기"
>
  <PlaceholderArt assetName={assetName} emoji="🏃" label="오늘의 캐릭터" />
</button>
```

Do not attach custom key handlers; native button semantics already provide Enter and Space activation.

- [ ] **Step 3: Add the dismissible speech bubble**

Render the bubble only when `message !== null`:

```tsx
<button
  type="button"
  className="home-character__speech"
  onClick={() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setMessage(null);
  }}
  role="status"
  aria-live="polite"
  aria-label={`대화 닫기: ${message}`}
>
  {message}
</button>
```

Wrap the speech bubble, platform, and character button in:

```tsx
<div className="home-character">
  ...
</div>
```

- [ ] **Step 4: Add component styles and animations**

Create `src/screens/HomeCharacterInteraction.css` with:

- `.home-character`: fills the parent, positions contents relative, aligns the character at the bottom.
- `.home-character__button`: transparent native button, full character area, visible `:focus-visible` ring, no padding or border.
- `.home-character__button .placeholder-art__img`: existing drop shadow and `character-idle-bob 3.2s ease-in-out infinite`.
- `.home-character__speech`: absolute above character, centered, width `min(70vw, 250px)`, two-line-friendly padding, white background, `2px solid #7a63d8`, navy text, rounded corners, shadow, z-index below top HUD and above character.
- Speech-tail pseudo-element centered below the bubble.
- Reaction classes and keyframes:
  - `bounce`: two small upward movements.
  - `wiggle`: left/right rotation.
  - `wave`: one side tilt and return.
  - `jump`: one larger upward movement.
  - `double-pop`: two short scale-and-lift pulses.
- Reaction classes must disable the idle animation during the reaction.
- `@media (max-width: 375px)` reduces bubble width and font size.
- `@media (prefers-reduced-motion: reduce)` disables idle bob and maps all five reaction classes to the same 180 ms scale-only keyframe.

- [ ] **Step 5: Run static verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands complete with exit code 0.

- [ ] **Step 6: Commit the interaction component**

```bash
git add src/screens/HomeCharacterInteraction.tsx src/screens/HomeCharacterInteraction.css
git commit -m "feat: add interactive home character component"
```

---

### Task 3: Integrate character interaction into the home screen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`

**Interfaces:**
- Consumes: `HomeCharacterInteraction` and existing `useGame()` values.
- Produces: the same home layout with an interactive character in place of the static character art.

- [ ] **Step 1: Replace the direct character rendering**

In `src/screens/HomeScreen.tsx`:

1. Import `HomeCharacterInteraction`.
2. Keep `PlaceholderArt` imported because the background and pack still use it.
3. Create this context before the return statement:

```ts
const characterDialogueContext = {
  hasUnopenedPack: unopenedPacks.length > 0,
  remainingWeeklySessions: weeklyProgress.remainingThisWeek,
  weeklyGoalComplete: weeklyProgress.remainingThisWeek === 0,
  todayLogged,
  streak: weeklyProgress.streak,
};
```

4. Replace only the existing character block contents:

```tsx
<div className="home-screen__layer home-screen__character">
  <span className="character-platform" />
  <HomeCharacterInteraction
    assetName={state.user.selectedCharacterId}
    dialogueContext={characterDialogueContext}
  />
</div>
```

Do not move or alter the record button, pack button, top HUD, or XP popover.

- [ ] **Step 2: Remove duplicated animation ownership from HomeScreen CSS**

In `src/screens/HomeScreen.css`:

- Keep `.home-screen__character` positioning, size, z-index, and flex alignment.
- Keep `.character-platform` unchanged.
- Remove the old `.home-screen__character .placeholder-art__img` animation rule.
- Remove the old `@keyframes character-bob` block.
- Do not change other home selectors.

- [ ] **Step 3: Run all automated checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass and lint/build exit with code 0.

- [ ] **Step 4: Perform browser interaction checks**

Run:

```bash
npm run dev
```

Verify at 375×667, 390×844, and 430×932:

1. Clicking the character shows a speech bubble and a reaction animation.
2. A second rapid click restarts the animation and changes the message when alternatives exist.
3. The speech bubble closes after approximately three seconds.
4. Clicking the bubble closes it immediately.
5. Enter and Space activate the focused character button.
6. The bubble does not cover the record button or block the pack button.
7. The level XP popover still opens and closes normally.
8. With reduced motion enabled, the character uses only the short scale response.

- [ ] **Step 5: Commit home integration**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.css
git commit -m "feat: connect character dialogue to home state"
```

---

### Task 4: Final regression verification and pull request

**Files:**
- Review: all files changed by Tasks 1–3.

**Interfaces:**
- Consumes: completed feature branch.
- Produces: a reviewable pull request with verified build status.

- [ ] **Step 1: Review the branch diff**

Run:

```bash
git diff --check
git diff <base-branch>...HEAD -- src/game/characterDialogue.ts src/game/characterDialogue.test.ts src/screens/HomeCharacterInteraction.tsx src/screens/HomeCharacterInteraction.css src/screens/HomeScreen.tsx src/screens/HomeScreen.css package.json
```

Confirm there are no whitespace errors, unrelated home-layout changes, or persistence-schema changes.

- [ ] **Step 2: Run the final verification suite**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Push and open a stacked pull request**

Push `feature/home-character-interaction` and open a PR against the branch it was created from. Include:

- Context-aware randomized dialogue and exact priority order.
- Five click reactions and reduced-motion behavior.
- Three-second dismissal and bubble click dismissal.
- No storage/schema/reward changes.
- Automated test, lint, and build results.
- Manual viewport verification results.

- [ ] **Step 4: Verify deployment status**

Wait for Vercel and repository checks to finish. Record the exact final commit SHA and report success only after the combined status is `success`. If a check fails, inspect its logs and fix the root cause before updating the PR summary.
