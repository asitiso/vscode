# Weekly Rewards and Timer Polish Design

## Scope

Implement the four approved follow-up tasks in order:
1. Weekly goal and streak correctness.
2. Weekly-goal dedicated reward pack and bonus feedback.
3. Clear unopened-pack entry point on Home.
4. Workout timer and completion idempotency hardening.

## Product rules

- A weekly goal session is an **active workout day**, not a raw log count. Multiple workouts saved on the same local calendar day count as one weekly-goal session.
- Weeks start Monday. Date calculations use the workout's local `YYYY-MM-DD` date key and must remain correct around year boundaries.
- Streak includes the current week once its goal is completed. While the current week is still incomplete, previously completed consecutive weeks keep the streak alive. A completed missed week breaks the streak when it becomes the immediately previous week.
- Completing the weekly target for the first time in a week grants the existing `pack-weekly-goal` exactly once and the existing +150 weekly-goal XP exactly once.
- When a workout completion grants both the normal workout pack and the weekly-goal pack, the weekly-goal pack is the primary immediate-open reward; other unopened packs remain available on Home.
- Home must show the number of unopened packs and open the next unopened pack without changing existing navigation structure.
- Timer elapsed time is wall-clock based so refresh/background time is preserved. Duplicate start/stop taps and duplicate Record completion taps must not create duplicate transitions, workout logs, or reward packs.
- No merge to another branch as part of this work.
