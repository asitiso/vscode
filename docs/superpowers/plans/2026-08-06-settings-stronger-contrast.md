# Settings Stronger Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the visual contrast of the settings screen while preserving all layout and behavior.

**Architecture:** Apply a CSS-only theme adjustment in `SettingsScreen.css`. Preserve the current state on a dedicated backup branch and isolate the visual change in one commit so rollback requires only one revert.

**Tech Stack:** React, TypeScript, CSS, Vite, Vercel Preview.

## Global Constraints

- Modify only `src/screens/SettingsScreen.css` for the visual implementation.
- Do not change component markup, order, spacing structure, functionality, or data flow.
- Keep cards light and retain orange as the primary accent.
- Target roughly 25% stronger perceived contrast, not a dark theme.
- Backup branch: `backup/settings-before-strong-contrast-20260806` at commit `b8537db6dddb8a01eed57b6ac253bfac7aaf85c9`.
- The CSS implementation must be one standalone commit.

---

### Task 1: Apply Stronger Settings Contrast

**Files:**
- Modify: `src/screens/SettingsScreen.css`

**Interfaces:**
- Consumes the existing class names in `SettingsScreen.tsx`.
- Produces no new class names or component dependencies.

- [ ] **Step 1: Capture the existing CSS and verify the backup branch exists**

Confirm the backup branch points to `b8537db6dddb8a01eed57b6ac253bfac7aaf85c9`.

- [ ] **Step 2: Strengthen the screen background**

Replace the pale white overlay with a blue-gray overlay that leaves the background visible while maintaining text readability.

- [ ] **Step 3: Strengthen the title and card hierarchy**

Use a navy title capsule with white text. Increase card border visibility and shadow depth without changing dimensions.

- [ ] **Step 4: Strengthen controls and typography**

Darken labels and secondary copy; use clearer blue-gray backgrounds and borders for inputs and character tiles. Preserve orange active states.

- [ ] **Step 5: Verify scope**

Confirm the visual commit changes only `src/screens/SettingsScreen.css` and contains no layout-property changes that alter section order or sizing.

- [ ] **Step 6: Verify Preview build**

Expected: Vercel Preview reaches READY with no TypeScript or CSS build errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/SettingsScreen.css
git commit -m "style: strengthen settings screen contrast"
```
