import { describe, expect, it } from 'vitest';
import { buildGroupMotivationView } from './groupMotivationSelectors';
import type { GroupMemberSummary } from './groupTypes';

const members: GroupMemberSummary[] = [
  { userId: 'a', nickname: '민서', todaySeconds: 4200, weeklySeconds: 9000, weeklyGoalPercent: 80, isActive: true },
  { userId: 'me', nickname: '나', todaySeconds: 1800, weeklySeconds: 7200, weeklyGoalPercent: 60, isActive: true },
  { userId: 'b', nickname: '혜미', todaySeconds: 3000, weeklySeconds: 10800, weeklyGoalPercent: 90, isActive: false },
];

describe('buildGroupMotivationView', () => {
  it('오늘 탭은 오늘 운동시간 순으로 정렬하고 내 추격 정보를 계산한다', () => {
    const view = buildGroupMotivationView(members, 'me', 'today');

    expect(view.activeCount).toBe(2);
    expect(view.totalSeconds).toBe(9000);
    expect(view.ranked.map((member) => member.userId)).toEqual(['a', 'b', 'me']);
    expect(view.myRank).toBe(3);
    expect(view.chase).toEqual({ targetNickname: '혜미', gapSeconds: 1200 });
  });

  it('이번 주 탭은 목표 달성률 우선, 주간 운동시간 보조 기준으로 정렬한다', () => {
    const view = buildGroupMotivationView(members, 'me', 'week');

    expect(view.totalSeconds).toBe(27000);
    expect(view.ranked.map((member) => member.userId)).toEqual(['b', 'a', 'me']);
    expect(view.myRank).toBe(3);
    expect(view.chase).toEqual({ targetNickname: '민서', gapPercent: 20, gapSeconds: 1800 });
  });
});
