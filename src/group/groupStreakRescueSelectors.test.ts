import { describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from './groupTypes';
import { buildGroupStreakRescueView } from './groupStreakRescueSelectors';

function member(overrides: Partial<GroupMemberSummary> & Pick<GroupMemberSummary, 'userId' | 'nickname'>): GroupMemberSummary {
  return {
    todaySeconds: 0,
    weeklySeconds: 0,
    weeklyGoalPercent: 0,
    isActive: false,
    ...overrides,
  };
}

describe('buildGroupStreakRescueView', () => {
  it('keeps only other members who have not worked out today and are not currently active', () => {
    const view = buildGroupStreakRescueView({
      members: [
        member({ userId: 'me', nickname: '나' }),
        member({ userId: 'done', nickname: '운동완료', todaySeconds: 60 }),
        member({ userId: 'active', nickname: '운동중', isActive: true }),
        member({ userId: 'b', nickname: '민서' }),
        member({ userId: 'a', nickname: '혜미' }),
      ],
      currentUserId: 'me',
      limit: 3,
    });

    expect(view.candidates.map((item) => item.userId)).toEqual(['b', 'a']);
    expect(view.remainingCount).toBe(0);
  });

  it('shows at most three candidates in Korean nickname order and reports the rest', () => {
    const view = buildGroupStreakRescueView({
      members: [
        member({ userId: '4', nickname: '윤희' }),
        member({ userId: '1', nickname: '가영' }),
        member({ userId: '3', nickname: '민서' }),
        member({ userId: '2', nickname: '나래' }),
      ],
      currentUserId: 'me',
      limit: 3,
    });

    expect(view.candidates.map((item) => item.nickname)).toEqual(['가영', '나래', '민서']);
    expect(view.remainingCount).toBe(1);
  });
});
