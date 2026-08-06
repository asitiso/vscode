import { describe, expect, it } from 'vitest';
import { createInitialState } from './storage';
import { gameReducer } from './GameContext';

describe('level milestone reducer', () => {
  it('claims a milestone atomically', () => {
    const state = createInitialState();
    const next = gameReducer(state, { type: 'CLAIM_LEVEL_MILESTONE', level: 10, currentLevel: 10 });

    expect(next.claimedLevelMilestones).toEqual([10]);
    expect(next.earnedBadges).toContain('level-10-explorer');
    expect(next.unlockedCosmetics).toContain('sports-headband');
    expect(next.grantedPacks).toContainEqual(expect.objectContaining({
      id: 'level-milestone-10',
      packDefId: 'pack-level-milestone',
      source: 'level-milestone',
      sourceMilestoneLevel: 10,
    }));
  });

  it('returns the same state for duplicate or invalid claims', () => {
    const state = createInitialState();
    const claimed = gameReducer(state, { type: 'CLAIM_LEVEL_MILESTONE', level: 10, currentLevel: 10 });

    expect(gameReducer(claimed, { type: 'CLAIM_LEVEL_MILESTONE', level: 10, currentLevel: 10 })).toBe(claimed);
    expect(gameReducer(state, { type: 'CLAIM_LEVEL_MILESTONE', level: 9, currentLevel: 10 })).toBe(state);
    expect(gameReducer(state, { type: 'CLAIM_LEVEL_MILESTONE', level: 20, currentLevel: 10 })).toBe(state);
  });

  it('preserves legendary pity when opening a milestone pack', () => {
    const state = createInitialState();
    state.user.legendaryPityCounter = 7;
    const claimed = gameReducer(state, { type: 'CLAIM_LEVEL_MILESTONE', level: 10, currentLevel: 10 });
    const opened = gameReducer(claimed, { type: 'OPEN_PACK', packId: 'level-milestone-10' });

    expect(opened.user.legendaryPityCounter).toBe(7);
    expect(opened.grantedPacks.find((pack) => pack.id === 'level-milestone-10')?.openedAt).toBeTruthy();
  });
});
