import { describe, expect, it } from 'vitest';
import {
  getHighestEarnedMilestoneBadge,
  getMilestoneBadge,
  getMilestoneCosmetic,
  getPendingLevelMilestone,
  isLevelMilestone,
} from './levelMilestones';

describe('level milestones', () => {
  it('accepts only positive multiples of ten from level 10', () => {
    expect(isLevelMilestone(9)).toBe(false);
    expect(isLevelMilestone(10)).toBe(true);
    expect(isLevelMilestone(20)).toBe(true);
    expect(isLevelMilestone(25)).toBe(false);
  });

  it('returns the lowest unclaimed milestone at or below the current level', () => {
    expect(getPendingLevelMilestone(9, [])).toBeNull();
    expect(getPendingLevelMilestone(30, [10])).toBe(20);
    expect(getPendingLevelMilestone(30, [10, 20, 30])).toBeNull();
  });

  it('returns stable configured and generated rewards', () => {
    expect(getMilestoneBadge(10)).toEqual({ id: 'level-10-explorer', label: 'Explorer' });
    expect(getMilestoneCosmetic(50)).toEqual({ id: 'crown', label: '왕관' });
    expect(getMilestoneBadge(60)).toEqual({ id: 'level-60-milestone', label: 'Lv.60 Milestone' });
    expect(getMilestoneCosmetic(60)).toEqual({ id: 'milestone-60', label: 'Lv.60 장식' });
  });

  it('returns the highest earned badge', () => {
    expect(getHighestEarnedMilestoneBadge([])).toBeNull();
    expect(getHighestEarnedMilestoneBadge([10, 30, 20])).toMatchObject({ level: 30, label: 'Elite' });
  });
});
