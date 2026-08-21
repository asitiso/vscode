import { describe, expect, it } from 'vitest';
import { buildGroupTeamStreakView } from './groupTeamStreakSelectors';

const today = '2026-08-21'; // Friday

function participation(date: string, participantCount: number) {
  return { date, participantCount };
}

describe('buildGroupTeamStreakView', () => {
  it('uses a ceil 50% participation target and builds the Monday-Sunday week', () => {
    const view = buildGroupTeamStreakView({
      memberCount: 5,
      today,
      dailyParticipation: [
        participation('2026-08-17', 3),
        participation('2026-08-18', 2),
        participation('2026-08-19', 4),
        participation('2026-08-20', 3),
        participation('2026-08-21', 2),
      ],
    });

    expect(view.target).toBe(3);
    expect(view.days.map((day) => day.label)).toEqual(['월', '화', '수', '목', '금', '토', '일']);
    expect(view.days.map((day) => day.participantCount)).toEqual([3, 2, 4, 3, 2, 0, 0]);
    expect(view.days.map((day) => day.completed)).toEqual([true, false, true, true, false, false, false]);
    expect(view.days.map((day) => day.isFuture)).toEqual([false, false, false, false, false, true, true]);
  });

  it('keeps the consecutive completed-day streak alive while today is still incomplete', () => {
    const view = buildGroupTeamStreakView({
      memberCount: 5,
      today,
      dailyParticipation: [
        participation('2026-08-17', 1),
        participation('2026-08-18', 1),
        participation('2026-08-19', 3),
        participation('2026-08-20', 5),
        participation('2026-08-21', 2),
      ],
    });

    expect(view.streakDays).toBe(2);
    expect(view.todayNeeded).toBe(1);
    expect(view.todayCompleted).toBe(false);
  });

  it('includes today when today reaches the team target', () => {
    const view = buildGroupTeamStreakView({
      memberCount: 4,
      today,
      dailyParticipation: [
        participation('2026-08-18', 1),
        participation('2026-08-19', 2),
        participation('2026-08-20', 3),
        participation('2026-08-21', 2),
      ],
    });

    expect(view.target).toBe(2);
    expect(view.streakDays).toBe(3);
    expect(view.todayNeeded).toBe(0);
    expect(view.todayCompleted).toBe(true);
  });

  it('does not accidentally complete an empty group', () => {
    const view = buildGroupTeamStreakView({ memberCount: 0, today, dailyParticipation: [] });

    expect(view.target).toBe(0);
    expect(view.streakDays).toBe(0);
    expect(view.todayCompleted).toBe(false);
    expect(view.todayNeeded).toBe(0);
  });
});
