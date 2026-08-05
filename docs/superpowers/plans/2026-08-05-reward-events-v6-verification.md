# Reward Events V6 Verification

- Vercel production build: success for commit `627153c2f5aa84ef108958739a2821e1ee2ded9d`.
- Compare base: `feature/reward-events-v5`.
- Changed runtime files: `src/App.tsx`, `src/game/rewardCombo.ts`, `src/screens/ComboPackOpeningScreen.tsx`, `src/screens/RewardEventsV6.css`.
- No changes to `src/types`, `src/game/cardDraw.ts`, pack probabilities, pity logic, reducer state shape, or storage schema.
- Manual checks required in Preview: single-pack fallback, two-or-more pack sequencing, 2/3/4-star celebration, category completion, early exit, and low-height mobile scrolling.
