# Record Screen Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve all workout-recording behavior while making the record screen visually clearer, brighter, and easier to scan on mobile.

**Architecture:** Keep `RecordScreen.tsx` state, data flow, callbacks, and form controls unchanged. Add only presentational wrappers and descriptive text, then replace `RecordScreen.css` with a card-based mobile layout using stronger contrast and clearer selected states.

**Tech Stack:** React 19, TypeScript, Vite, plain CSS.

## Global Constraints

- Do not change `completeWorkout`, `onDone`, `onNavigate`, exercise selection, feeling selection, memo handling, or set-entry updates.
- Do not add dependencies.
- Keep all existing labels and available choices.
- Optimize for 375px, 390px, and 430px mobile widths.
- Keep the existing background asset but reduce its interference with content.
- Preserve keyboard focus visibility and disabled-button behavior.

---

### Task 1: Clarify the record screen hierarchy

**Files:**
- Modify: `src/screens/RecordScreen.tsx`

**Interfaces:**
- Consumes: existing `RecordScreenProps`, `useGame`, `EXERCISES`, `FEELINGS`.
- Produces: the same `RecordScreen` component contract and behavior.

- [ ] **Step 1: Inspect the existing interaction paths**

Confirm the component still exposes recent exercise selection, category selection, exercise selection, set inputs, feeling selection, memo input, cancel, and complete actions.

- [ ] **Step 2: Add presentation-only structure**

Add a header eyebrow and subtitle, wrap the scrollable form sections in a content container, add section heading rows with short helper text, and add a selected-count summary above set records. Do not change event handlers, state, conditions, input values, or callback calls.

- [ ] **Step 3: Run the TypeScript build**

Run: `npm run build`
Expected: Vite production build completes without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/RecordScreen.tsx
git commit -m "refactor: clarify workout record screen hierarchy"
```

### Task 2: Apply the high-clarity card layout

**Files:**
- Modify: `src/screens/RecordScreen.css`

**Interfaces:**
- Consumes: class names rendered by `RecordScreen.tsx`.
- Produces: responsive styling only; no JavaScript behavior.

- [ ] **Step 1: Replace the washed-out full-screen overlay**

Use a light cream page base with a short, softly faded background image in the upper area. Ensure body text sits on opaque or near-opaque cards.

- [ ] **Step 2: Style the header and content cards**

Create a prominent title block, white/cream section cards, darker headings, subtle borders, and consistent 16–20px spacing.

- [ ] **Step 3: Strengthen selection states**

Use purple for active chips and feeling buttons, white for inactive controls, clear borders, focus-visible rings, and pressed-state feedback.

- [ ] **Step 4: Improve form and action layout**

Keep set inputs legible, make the memo field obvious, and keep the sticky action bar above the bottom navigation with sufficient safe-area padding.

- [ ] **Step 5: Add narrow-width rules**

At widths below 390px, reduce horizontal padding and keep the feeling grid usable without truncating labels.

- [ ] **Step 6: Run the production build**

Run: `npm run build`
Expected: build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add src/screens/RecordScreen.css
git commit -m "style: sharpen workout record screen layout"
```

### Task 3: Verify behavior and responsive layout

**Files:**
- Verify: `src/screens/RecordScreen.tsx`
- Verify: `src/screens/RecordScreen.css`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: verified mobile record screen.

- [ ] **Step 1: Verify unchanged behavior**

Check that selecting and deselecting exercises works, recent exercises still toggle, category changes still filter exercises, set values remain editable, one feeling is selectable, memo remains optional, cancel returns home, and completion remains disabled until an exercise and feeling are selected.

- [ ] **Step 2: Verify mobile widths**

Review at 375px, 390px, and 430px. Confirm no horizontal scrolling, no content underlap with the bottom navigation, and no clipped action buttons.

- [ ] **Step 3: Run final build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 4: Review the final diff**

Confirm only presentation markup and CSS changed and no workout logic was modified.
