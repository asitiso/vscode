# Settings Stronger Contrast Design

## Goal

Make the settings screen feel visually stronger and less washed out without changing layout, behavior, data flow, component order, or Supabase controls.

## Scope

Only `src/screens/SettingsScreen.css` changes. `SettingsScreen.tsx`, store logic, routes, card order, button behavior, and data-management behavior remain unchanged.

## Visual Direction

- Keep the bright Japanese casual-game character.
- Reduce the strength of the white background wash and introduce a cooler blue-gray overlay.
- Change the title capsule to a dark navy gradient with white title text.
- Increase section separation using a clearer blue-gray border and deeper shadow.
- Darken labels and supporting text.
- Increase contrast inside inputs and character tiles while preserving orange as the primary accent.
- Keep cards themselves light so the screen does not become heavy or dark-mode-like.

## Rollback Safety

- Preserve commit `b8537db6dddb8a01eed57b6ac253bfac7aaf85c9` on branch `backup/settings-before-strong-contrast-20260806`.
- Put the production CSS change in one standalone commit.
- Reverting that single CSS commit restores the previous settings appearance.

## Acceptance Criteria

- The screen reads approximately 25% stronger in contrast.
- Header, section boundaries, labels, input fields, and character tiles are visually clearer.
- Existing spacing, sizes, order, responsive behavior, and functionality do not change.
- No files other than `src/screens/SettingsScreen.css` are changed by the visual implementation commit.
