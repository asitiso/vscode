import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { computeWeeklyProgress, countSessionsByWeek, getWeekKey } from './weeklyGoal';

function log(id: string, date: string): WorkoutLog {
  return {
    id,
    date,
    entries: [],
    feeling: 'moderate',
    grantedPackIds: [],
    createdAt: `${date}T03:00:00.000Z`,
  };
}

describe('weekly goal calendar rules', () => {
  it('counts multiple workout logs on the same local day as one weekly session', () => {
    const counts = countSessionsByWeek([
      log('a', '2026-08-17'),
      log('b', '2026-08-17'),
      log('c', '2026-08-19'),
    ]);

    expect(counts.get(getWeekKey('2026-08-19'))).toBe(2);
  });

  it('uses ISO week-year correctly around New Year', () => {
    expect(getWeekKey('2025-12-29')).toBe('2026-W01');
    expect(getWeekKey('2026-01-04')).toBe('2026-W01');
    expect(getWeekKey('2026-01-05')).toBe('2026-W02');
  });

  it('resets current progress on Monday while preserving the completed previous-week streak', () => {
    const logs = [
      log('a', '2026-08-17'),
      log('b', '2026-08-19'),
      log('c', '2026-08-21'),
    ];

    const progress = computeWeeklyProgress(logs, 3, new Date('2026-08-24T12:00:00+09:00'));

    expect(progress.sessionsThisWeek).toBe(0);
    expect(progress.remainingThisWeek).toBe(3);
    expect(progress.streak).toBe(1);
  });

  it('includes the current week in streak immediately when this week is completed', () => {
    const logs = [
      log('p1', '2026-08-10'),
      log('p2', '2026-08-12'),
      log('p3', '2026-08-14'),
      log('c1', '2026-08-17'),
      log('c2', '2026-08-19'),
      log('c3', '2026-08-21'),
    ];

    const progress = computeWeeklyProgress(logs, 3, new Date('2026-08-21T12:00:00+09:00'));

    expect(progress.sessionsThisWeek).toBe(3);
    expect(progress.remainingThisWeek).toBe(0);
    expect(progress.streak).toBe(2);
  });

  it('breaks the streak after a missed completed week', () => {
    const logs = [
      log('old1', '2026-08-03'),
      log('old2', '2026-08-05'),
      log('old3', '2026-08-07'),
    ];

    const progress = computeWeeklyProgress(logs, 3, new Date('2026-08-17T12:00:00+09:00'));

    expect(progress.streak).toBe(0);
  });
});
