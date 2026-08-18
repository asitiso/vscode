import { describe, expect, it } from 'vitest';
import { formatWorkoutSeconds, rankGroupMembers } from './groupSelectors';
import type { GroupMemberSummary } from './groupTypes';

function member(nickname: string, weeklyGoalPercent: number, weeklySeconds: number): GroupMemberSummary {
  return { userId: nickname, nickname, todaySeconds: 0, weeklySeconds, weeklyGoalPercent, isActive: false };
}

describe('group selectors', () => {
  it('ranks goal progress before workout time', () => {
    const ranked = rankGroupMembers([
      member('가', 80, 9000),
      member('나', 100, 1000),
      member('다', 100, 2000),
    ]);
    expect(ranked.map((item) => item.nickname)).toEqual(['다', '나', '가']);
  });

  it('formats seconds for compact group UI', () => {
    expect(formatWorkoutSeconds(0)).toBe('0분');
    expect(formatWorkoutSeconds(65 * 60)).toBe('1시간 5분');
  });
});
