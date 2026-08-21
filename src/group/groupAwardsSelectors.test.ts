import { describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from './groupTypes';
import { buildGroupAwardsView } from './groupAwardsSelectors';

function member(
  userId: string,
  nickname: string,
  todaySeconds: number,
  weeklySeconds: number,
  weeklyGoalPercent: number,
): GroupMemberSummary {
  return {
    userId,
    nickname,
    todaySeconds,
    weeklySeconds,
    weeklyGoalPercent,
    isActive: false,
  };
}

describe('buildGroupAwardsView', () => {
  it('오늘 운동시간이 가장 긴 멤버를 오늘의 불꽃으로 뽑는다', () => {
    const view = buildGroupAwardsView([
      member('a', '민수', 1800, 7200, 80),
      member('b', '혜미', 3120, 5400, 70),
      member('c', '유나', 600, 3600, 60),
    ]);

    expect(view.todayFlame?.member.userId).toBe('b');
    expect(view.todayFlame?.todaySeconds).toBe(3120);
  });

  it('목표 사냥꾼은 오늘의 불꽃과 다른 사람 중 목표 달성률이 가장 높은 멤버를 뽑는다', () => {
    const view = buildGroupAwardsView([
      member('a', '민수', 3600, 7200, 120),
      member('b', '혜미', 1800, 5400, 110),
      member('c', '유나', 600, 3600, 90),
    ]);

    expect(view.todayFlame?.member.userId).toBe('a');
    expect(view.goalHunter?.member.userId).toBe('b');
    expect(view.goalHunter?.weeklyGoalPercent).toBe(110);
  });

  it('숨은 영웅은 MVP와 앞서 수상한 멤버를 제외하고 기여도가 가장 높은 멤버를 뽑는다', () => {
    const view = buildGroupAwardsView([
      member('a', '민수', 3600, 9000, 100),
      member('b', '혜미', 2400, 7200, 100),
      member('c', '유나', 1800, 5400, 80),
      member('d', '준호', 600, 3600, 60),
    ]);

    expect(view.mvpUserId).toBe('a');
    expect(view.todayFlame?.member.userId).toBe('a');
    expect(view.goalHunter?.member.userId).toBe('b');
    expect(view.hiddenHero?.member.userId).toBe('c');
    expect(view.hiddenHero?.score).toBeGreaterThan(0);
  });

  it('한 사람에게 여러 칭호를 억지로 중복 수여하지 않는다', () => {
    const view = buildGroupAwardsView([
      member('a', '민수', 3600, 9000, 100),
    ]);

    expect(view.todayFlame?.member.userId).toBe('a');
    expect(view.goalHunter).toBeNull();
    expect(view.hiddenHero).toBeNull();
  });

  it('수상 조건이 없는 멤버만 있으면 시상 결과가 비어 있다', () => {
    const view = buildGroupAwardsView([
      member('a', '민수', 0, 0, 0),
      member('b', '혜미', 0, 0, 0),
    ]);

    expect(view.todayFlame).toBeNull();
    expect(view.goalHunter).toBeNull();
    expect(view.hiddenHero).toBeNull();
  });

  it('동률이면 닉네임 오름차순으로 안정적으로 결정한다', () => {
    const view = buildGroupAwardsView([
      member('b', '나', 1800, 1800, 50),
      member('a', '가', 1800, 1800, 50),
      member('c', '다', 1800, 1800, 50),
    ]);

    expect(view.todayFlame?.member.nickname).toBe('가');
    expect(view.goalHunter?.member.nickname).toBe('나');
  });
});
