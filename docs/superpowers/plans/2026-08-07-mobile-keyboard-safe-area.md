# Mobile Keyboard and Safe Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize mobile input layouts when the software keyboard opens and keep bottom content visible above the iPhone home indicator without changing non-input screen designs.

**Architecture:** Extend the existing `VisualViewport` measurement pipeline instead of introducing a second viewport system. Expose viewport offset and safe-area variables globally, then make only input-heavy screens use a flex column with an independently scrollable body and a non-shrinking footer. Add a small focus-visibility hook for the remaining iOS cases where CSS scrolling alone does not reveal the focused field.

**Tech Stack:** React 19, TypeScript 6, Vite 8, CSS dynamic viewport units, `window.visualViewport`, Vitest 3, Testing Library.

## Global Constraints

- Keep the existing `VisualViewport` and keyboard detection architecture.
- Keep the keyboard-open threshold at 160px.
- Do not redesign Home, Collection, Rewards, or Bottom Navigation.
- Do not hardcode iPhone model heights or separate iOS and Android components.
- Hide Bottom Navigation while the keyboard is open, as the app already does.
- Apply focused-field scrolling only to `input`, `textarea`, and `select`, only while the keyboard is open, and only when the field is outside the visible viewport.
- Do not run focus scrolling while body scroll is locked by a modal.
- Use `env(safe-area-inset-*)` with zero-value fallbacks.
- Report tests, build, or deployment as successful only after fresh command output confirms success.
- Do not merge any pull request unless the user explicitly asks.

---

## File Structure

**Create**
- `src/hooks/useFocusedFieldVisibility.ts` — focused input visibility correction for keyboard-open iOS cases.
- `src/hooks/useFocusedFieldVisibility.test.tsx` — focus correction behavior tests.

**Modify**
- `src/utils/viewport.ts` — include viewport offset and derived visible bounds in state and CSS variables.
- `src/utils/viewport.test.ts` — test fallback, offset, keyboard threshold, and variable synchronization.
- `src/hooks/useViewportState.ts` — expose the extended viewport state without changing its public usage pattern.
- `src/index.css` — define safe-area variables and global fallback values.
- `src/App.css` — apply viewport offset and normalized bottom-space variables to the app shell.
- `src/MobileViewport.css` — consolidate safe-area and bottom navigation calculations.
- `src/ScreenStability.css` — add reusable input-screen body/footer stability classes.
- `src/App.tsx` — continue hiding navigation from viewport state and pass keyboard state only where needed.
- `src/screens/RecordScreen.tsx` — apply the shared input-screen structure and focus hook.
- `src/screens/RecordScreen.css` — make the form body scrollable and the action footer non-shrinking.
- `src/screens/SettingsScreen.tsx` — apply the shared input-screen structure and focus hook.
- `src/screens/SettingsScreen.css` — reserve bottom safe area and stabilize name/data controls.

---

### Task 1: Extend viewport measurements and CSS variables

**Files:**
- Modify: `src/utils/viewport.ts`
- Modify: `src/utils/viewport.test.ts`
- Modify: `src/hooks/useViewportState.ts`

**Interfaces:**
- Extends `ViewportState` with `offsetTop: number`, `visibleTop: number`, and `visibleBottom: number`.
- `measureViewport(measurement)` returns the extended state.
- `syncViewportCssVariables(state, target)` writes `--app-viewport-offset-top` in addition to existing variables.

- [ ] **Step 1: Add failing viewport tests**

Add cases equivalent to:

```ts
expect(measureViewport({ innerHeight: 844 })).toMatchObject({
  layoutHeight: 844,
  visibleHeight: 844,
  offsetTop: 0,
  visibleTop: 0,
  visibleBottom: 844,
  isKeyboardOpen: false,
});

expect(measureViewport({
  innerHeight: 844,
  visualViewportHeight: 500,
  visualViewportOffsetTop: 44,
})).toMatchObject({
  visibleHeight: 500,
  offsetTop: 44,
  visibleTop: 44,
  visibleBottom: 544,
  keyboardHeight: 300,
  isKeyboardOpen: true,
});
```

Also assert that `syncViewportCssVariables` writes:

```ts
expect(setProperty).toHaveBeenCalledWith('--app-viewport-offset-top', '44px');
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npm test -- src/utils/viewport.test.ts
```

Expected: FAIL because the new fields and CSS variable do not exist.

- [ ] **Step 3: Implement the extended state**

Calculate:

```ts
const offsetTop = Math.max(0, Math.round(measurement.visualViewportOffsetTop ?? 0));
const visibleTop = offsetTop;
const visibleBottom = visibleTop + visibleHeight;
const rawDifference = Math.max(0, layoutHeight - visibleHeight - offsetTop);
```

Keep `KEYBOARD_OPEN_THRESHOLD_PX = 160` unchanged. Add the new fields to SSR initial state in `useViewportState.ts`.

- [ ] **Step 4: Synchronize the offset CSS variable**

Add:

```ts
target.setProperty('--app-viewport-offset-top', `${state.offsetTop}px`);
```

Do not remove any current CSS variables.

- [ ] **Step 5: Run focused tests**

```bash
npm test -- src/utils/viewport.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/viewport.ts src/utils/viewport.test.ts src/hooks/useViewportState.ts
git commit -m "fix: stabilize visual viewport measurements"
```

---

### Task 2: Normalize global safe-area and app-shell spacing

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.css`
- Modify: `src/MobileViewport.css`

**Interfaces:**
- Produces global CSS variables: `--safe-area-top`, `--safe-area-bottom`, `--screen-bottom-space`.
- `.app-shell` consumes `--app-viewport-height` and `--app-viewport-offset-top`.
- `.bottom-nav` uses one normalized safe-area calculation.

- [ ] **Step 1: Add global fallback variables**

In `:root`, define:

```css
--app-viewport-offset-top: 0px;
--safe-area-top: env(safe-area-inset-top, 0px);
--safe-area-bottom: env(safe-area-inset-bottom, 0px);
--screen-bottom-space: calc(var(--bottom-nav-height) + var(--safe-area-bottom));
```

Keep current theme variables unchanged.

- [ ] **Step 2: Apply viewport offset to the app shell**

Use the measured offset without moving individual screens:

```css
.app-shell {
  height: var(--app-viewport-height, 100dvh);
  max-height: var(--app-viewport-height, 100dvh);
  transform: translateY(var(--app-viewport-offset-top, 0px));
}
```

For desktop-width framed mode, retain the current margin and radius behavior. Do not add offset a second time in child screens.

- [ ] **Step 3: Consolidate Bottom Navigation safe-area math**

Replace repeated direct environment calls with:

```css
.bottom-nav {
  height: calc(var(--app-bottom-nav-height) + var(--safe-area-bottom));
  min-height: calc(72px + var(--safe-area-bottom));
  padding-bottom: max(6px, var(--safe-area-bottom));
}
```

When `.app-shell[data-keyboard-open='true']` is active, set:

```css
--safe-area-bottom: 0px;
--screen-bottom-space: 0px;
```

so keyboard-open screens do not retain an empty home-indicator gap.

- [ ] **Step 4: Preserve non-input layouts**

Verify that no Home, Collection, Rewards, or Bottom Navigation positional selector is otherwise changed. Keep the existing short-height media queries.

- [ ] **Step 5: Run CSS-related test suite and build**

```bash
npm test
npm run build
```

Expected: PASS. If no CSS assertions exist, build is the type/import verification for this task.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/App.css src/MobileViewport.css
git commit -m "style: apply mobile safe area spacing"
```

---

### Task 3: Add focused-field visibility correction

**Files:**
- Create: `src/hooks/useFocusedFieldVisibility.ts`
- Create: `src/hooks/useFocusedFieldVisibility.test.tsx`

**Interfaces:**

```ts
interface FocusedFieldVisibilityOptions {
  isKeyboardOpen: boolean;
  delayMs?: number;
  marginPx?: number;
}

export function useFocusedFieldVisibility(options: FocusedFieldVisibilityOptions): void;
```

- [ ] **Step 1: Write failing hook tests**

Cover these cases:

```ts
// keyboard closed: never scroll
// keyboard open and element fully visible: never scroll
// keyboard open and element below visible viewport: scrollIntoView({ block: 'nearest', behavior: 'smooth' })
// body overflow hidden: never scroll
```

Mock `window.visualViewport` with `height` and `offsetTop`, dispatch `focusin`, advance fake timers, and assert the field spy.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npm test -- src/hooks/useFocusedFieldVisibility.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Listen to `focusin` only while `isKeyboardOpen` is true. Accept only:

```ts
const isField = target instanceof HTMLInputElement
  || target instanceof HTMLTextAreaElement
  || target instanceof HTMLSelectElement;
```

Skip when:

```ts
document.body.style.overflow === 'hidden'
```

After `delayMs ?? 120`, compare `getBoundingClientRect()` against:

```ts
const top = window.visualViewport?.offsetTop ?? 0;
const bottom = top + (window.visualViewport?.height ?? window.innerHeight);
```

Call `scrollIntoView` only when the rect is outside `top + marginPx` or `bottom - marginPx`.

- [ ] **Step 4: Clean up listeners and timers**

The hook cleanup must remove `focusin` and clear a pending timeout to avoid delayed movement after navigation.

- [ ] **Step 5: Run focused tests**

```bash
npm test -- src/hooks/useFocusedFieldVisibility.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFocusedFieldVisibility.ts src/hooks/useFocusedFieldVisibility.test.tsx
git commit -m "fix: keep focused mobile fields visible"
```

---

### Task 4: Add reusable input-screen stability classes

**Files:**
- Modify: `src/ScreenStability.css`

**Interfaces:**
- Produces `.input-screen`, `.input-screen__content`, `.input-screen__footer`.
- Input screens consume these classes without changing their business logic.

- [ ] **Step 1: Add the shared layout primitives**

```css
.input-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.input-screen__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scroll-padding-top: calc(var(--safe-area-top) + 16px);
  scroll-padding-bottom: calc(96px + var(--safe-area-bottom));
}

.input-screen__footer {
  flex: 0 0 auto;
  padding-bottom: max(12px, var(--safe-area-bottom));
}

.app-shell[data-keyboard-open='true'] .input-screen__content {
  scroll-padding-bottom: 140px;
}

.app-shell[data-keyboard-open='true'] .input-screen__footer {
  padding-bottom: 8px;
}
```

- [ ] **Step 2: Ensure shared classes do not alter other screens**

Do not apply these rules to generic `.screen`, `.page`, or `.app-shell__screen` selectors. The new behavior must require explicit class usage.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ScreenStability.css
git commit -m "style: add stable mobile input screen layout"
```

---

### Task 5: Stabilize the Record screen

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordScreen.css`
- Test: existing Record screen tests, or create `src/screens/RecordScreen.mobile.test.tsx` if no suitable test exists.

**Interfaces:**
- `RecordScreen` receives `isKeyboardOpen?: boolean`, defaulting to `false` for test and source compatibility.
- `RecordScreen` calls `useFocusedFieldVisibility({ isKeyboardOpen })`.

- [ ] **Step 1: Add a failing structure test**

Render `RecordScreen` and assert the root, scroll body, and footer classes:

```ts
expect(container.querySelector('.input-screen')).toBeInTheDocument();
expect(container.querySelector('.input-screen__content')).toBeInTheDocument();
expect(container.querySelector('.input-screen__footer')).toBeInTheDocument();
```

Keep existing navigation and form interaction mocks unchanged.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npm test -- src/screens/RecordScreen.mobile.test.tsx
```

Expected: FAIL because the shared structure is not applied.

- [ ] **Step 3: Pass keyboard state from App**

Change only the Record screen invocation:

```tsx
<RecordScreen
  isKeyboardOpen={viewport.isKeyboardOpen}
  onDone={() => navigate('home')}
  onNavigate={navigate}
/>
```

- [ ] **Step 4: Apply the shared structure and hook**

Wrap the existing Record screen content without changing fields, handlers, or order:

```tsx
<div className="record-screen input-screen">
  <div className="record-screen__scroll input-screen__content">...</div>
  <div className="record-screen__actions input-screen__footer">...</div>
</div>
```

Call:

```ts
useFocusedFieldVisibility({ isKeyboardOpen });
```

- [ ] **Step 5: Remove conflicting fixed-height behavior**

In `RecordScreen.css`, remove or override only selectors that force the form body or action region to remain absolutely positioned during keyboard-open state. Preserve colors, spacing, card styles, and button appearance.

- [ ] **Step 6: Run focused tests and build**

```bash
npm test -- src/screens/RecordScreen.mobile.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/screens/RecordScreen.tsx src/screens/RecordScreen.css src/screens/RecordScreen.mobile.test.tsx
git commit -m "fix: stabilize record screen with mobile keyboard"
```

---

### Task 6: Stabilize the Settings screen

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.css`
- Test: existing Settings tests, or create `src/screens/SettingsScreen.mobile.test.tsx`.

**Interfaces:**
- `SettingsScreen` receives `isKeyboardOpen?: boolean`, defaulting to `false`.
- `SettingsScreen` calls `useFocusedFieldVisibility({ isKeyboardOpen })`.

- [ ] **Step 1: Add a failing structure test**

Assert that the Settings screen uses `.input-screen` and `.input-screen__content`, and that its lowest data-management section remains inside the scrollable content rather than behind navigation.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npm test -- src/screens/SettingsScreen.mobile.test.tsx
```

Expected: FAIL because the shared structure is not applied.

- [ ] **Step 3: Pass keyboard state from App**

```tsx
<SettingsScreen isKeyboardOpen={viewport.isKeyboardOpen} />
```

- [ ] **Step 4: Apply the shared structure and hook**

Keep all setting sections and data-management actions intact. Use:

```tsx
<div className="settings-screen input-screen">
  <div className="settings-screen__content input-screen__content">...</div>
</div>
```

If Settings has a persistent bottom action area, mark only that element with `.input-screen__footer`; otherwise keep all settings in the scroll body.

- [ ] **Step 5: Reserve normal-state bottom space**

Ensure the final section receives:

```css
padding-bottom: calc(24px + var(--screen-bottom-space));
```

and keyboard-open mode replaces that with a smaller visible-viewport padding rather than retaining Bottom Navigation space.

- [ ] **Step 6: Run focused tests and build**

```bash
npm test -- src/screens/SettingsScreen.mobile.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/screens/SettingsScreen.tsx src/screens/SettingsScreen.css src/screens/SettingsScreen.mobile.test.tsx
git commit -m "fix: stabilize settings screen safe area"
```

---

### Task 7: Full regression and device-sized verification

**Files:**
- Modify only files required by failures found in this task.

**Interfaces:**
- No new interface. This task verifies the completed behavior.

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run lint and production build**

```bash
npm run lint
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Verify CSS and viewport requirements manually**

Use browser device emulation at minimum:

```text
iPhone 15 portrait: 393 × 852
Android portrait: 412 × 915
Short viewport with keyboard simulation: visible height near 500px
```

Check:

```text
Record memo and numeric fields remain reachable while keyboard is open.
Record action buttons do not overlap the focused field.
Settings name input remains visible while typing.
The last Settings data-management section scrolls above Bottom Navigation.
Bottom Navigation disappears when keyboard state is true and returns when false.
Home indicator does not cover bottom buttons or content.
Home, Collection, and Rewards retain their previous visual layout.
Orientation change recalculates viewport height and offset.
```

- [ ] **Step 4: Check the latest commit status and deployment**

Confirm GitHub checks and Vercel deployment status for the final commit. If Vercel reports `build-rate-limit`, report deployment as blocked rather than successful.

- [ ] **Step 5: Commit any verification-only corrections**

```bash
git add <only corrected files>
git commit -m "fix: complete mobile viewport regression corrections"
```

Skip this commit when no correction was required.
