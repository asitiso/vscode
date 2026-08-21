import { describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from './groupTypes';
import { buildGroupQuestView } from './groupQuestSelectors';

function member(
  userId: string,
  nickname: string,
  weeklySeconds: number,
  weeklyGoalPercent: number,
): GroupMemberSummary {
  return {
    userId,
    nickname,
    todaySeconds: 0,
    weeklySeconds,
    weeklyGoalPercent,
    isActive: false,
  };
}

describe('buildGroupQuestView', () => {
  it('4명 그룹의 출석 목표는 3명이고 시간 목표는 240분이다', () => {
    const view = buildGroupQuestView([
      member('a', '가', 1800, 20),
      member('b', '나', 3600, 40),
      member('c', '다', 0, 0),
      member('d', '라', 0, 0),
    ]);
    expect(view.attendance.target).toBe(3);
    expect(view.attendance.current).toBe(2);
    expect(view.time.target).toBe(240);
    expect(view.time.current).toBe(90);
  });

  it('5명 그룹의 개인목표 완료 목표는 3명이다', () => {
    const view = buildGroupQuestView(Array.from({ length: 5 }, (_, index) => member(String(index), `멤버${index}`, 0, 0)));
    expect(view.goal.target).toBe(3);
  });

  it('진행률은 100%를 넘지 않고 세 미션이 모두 완료되면 allCompleted가 true다', () => {
    const view = buildGroupQuestView([
      member('a', '가', 10800, 120),
      member('b', '나', 10800, 100),
    ]);
    expect(view.attendance.completed).toBe(true);
    expect(view.time.completed).toBe(true);
    expect(view.goal.completed).toBe(true);
    expect(view.time.progressPercent).toBe(100);
    expect(view.allCompleted).toBe(true);
  });

  it('MVP 시간 점수는 4점으로 제한되고 100% 목표 달성 시 최대 8점이다', () => {
    const view = buildGroupQuestView([member('a', '민수', 9000, 100)]);
    expect(view.mvp?.score).toBe(8);
  });

  it('50%와 100% 목표 경계를 각각 적용한다', () => {
    const below = buildGroupQuestView([member('a', '가', 1800, 49)]);
    const half = buildGroupQuestView([member('a', '가', 1800, 50)]);
    const full = buildGroupQuestView([member('a', '가', 1800, 100)]);
    expect(below.mvp?.score).toBe(2);
    expect(half.mvp?.score).toBe(3);
    expect(full.mvp?.score).toBe(5);
  });

  it('MVP 동률은 목표 달성률, 운동시간, 닉네임 순서로 푼다', () => {
    const byGoal = buildGroupQuestView([
      member('a', '가', 3600, 60),
      member('b', '나', 3600, 70),
    ]);
    expect(byGoal.mvp?.member.userId).toBe('b');

    const byTime = buildGroupQuestView([
      member('a', '가', 1800, 60),
      member('b', '나', 3000, 60),
    ]);
    expect(byTime.mvp?.member.userId).toBe('b');

    const byName = buildGroupQuestView([
      member('a', '가', 1800, 60),
      member('b', '나', 1800, 60),
    ]);
    expect(byName.mvp?.member.userId).toBe('a');
  });

  it('모두 0점이면 MVP가 없고 음수 시간은 0으로 정규화한다', () => {
    const view = buildGroupQuestView([
      member('a', '가', -100, 0),
      member('b', '나', 0, 0),
    ]);
    expect(view.time.current).toBe(0);
    expect(view.mvp).toBeNull();
  });

  it('빈 그룹은 0/0이더라도 완료로 판정하지 않는다', () => {
    const view = buildGroupQuestView([]);
    expect(view.attendance).toEqual({ current: 0, target: 0, completed: false, progressPercent: 0 });
    expect(view.time.completed).toBe(false);
    expect(view.goal.completed).toBe(false);
    expect(view.allCompleted).toBe(false);
    expect(view.mvp).toBeNull();
  });
});
