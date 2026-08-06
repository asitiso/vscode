# Record Screen Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workout record screen visually crisp without changing its behavior or data flow.

**Architecture:** Keep the existing React structure and modify only record-screen presentation styles. Use a pre-change backup branch and one isolated implementation commit so the entire update can be reverted safely.

**Tech Stack:** React, TypeScript, CSS, Vite, Vercel Preview

## Global Constraints
- Do not change workout selection, form state, save logic, navigation, or Supabase behavior.
- Preserve current responsive and keyboard-open behavior.
- Keep the background illustration only as a faint decorative layer.
- Use fully opaque cards and controls.
- Preserve the existing purple accent identity.

---

### Task 1: Establish rollback point

**Files:**
- No file changes

- [x] Create branch `backup/record-screen-before-clarity-update-20260806` from `feature/add-equipment-cards-v2`.
- [x] Confirm the current record screen CSS remains available on that branch.

### Task 2: Improve background and card separation

**Files:**
- Modify: `src/screens/RecordScreen.css`

- [ ] Increase the neutral overlay opacity so the gym illustration is decorative only.
- [ ] Change `.record-card` and nested content groups to opaque white surfaces.
- [ ] Replace faint dividers with rounded internal group cards.

### Task 3: Strengthen typography and control boundaries

**Files:**
- Modify: `src/screens/RecordScreen.css`

- [ ] Introduce primary, secondary, and muted record-screen text variables.
- [ ] Apply stronger text values to titles, group labels, buttons, and form controls.
- [ ] Increase neutral border contrast without using heavy black outlines.

### Task 4: Clarify selected states and action area

**Files:**
- Modify: `src/screens/RecordScreen.css`

- [ ] Render selected chips and feeling buttons with solid purple fill and white text.
- [ ] Keep unselected controls white with visible borders.
- [ ] Replace the transparent action gradient with an opaque action bar and top separation.
- [ ] Preserve keyboard-open overrides and bottom navigation spacing.

### Task 5: Verify

**Files:**
- No expected source changes unless verification reveals an issue.

- [ ] Confirm the branch deployment builds successfully.
- [ ] Check the record screen at narrow mobile width and short viewport height.
- [ ] Confirm all controls remain clickable and selected states remain visible.
- [ ] Confirm keyboard-open behavior and sticky actions remain usable.
- [ ] Keep the implementation in one isolated style commit for immediate rollback.
