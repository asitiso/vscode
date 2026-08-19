import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { buildRollingWorkoutSummary, buildWorkoutLogHistoryItem, getWorkoutSessionSeconds } from './workoutHistorySummary';

function log(input: Partial<WorkoutLog> & Pick<WorkoutLog, 'id' | 'date'>): WorkoutLog {
  return {
    id: input.id,
    date: input.date,
    entries: input.entries ?? [],
    feeling: input.feeling ?? 'moderate',
    memo: input.memo,
    durationSeconds: input.durationSeconds,
    grantedPackIds: input.grantedPackIds ?? [],
    createdAt: input.createdAt ?? `${input.date}T12:00:00.000Z`,
  };
}

describe('workout history summary', () => {
  it('uses stored session duration and falls back to duration exercise minutes for old logs', () => {
    expect(getWorkoutSessionSeconds(log({
      id: 'new',
      date: '2026-08-19',
      durationSeconds: 2_538,
      entries: [{ exerciseId: 'run', durationMinutes: 20 }],
    }))).toBe(2_538);

    expect(getWorkoutSessionSeconds(log({
      id: 'old',
      date: '2026-08-18',
      entries: [
        { exerciseId: 'run', durationMinutes: 20 },
        { exerciseId: 'stretch', durationMinutes: 5 },
      ],
    }))).toBe(1_500);
  });

  it('calculates rolling 7-day and 4-week workout time from the requested end date', () => {
    const logs = [
      log({ id: 'today', date: '2026-08-19', durationSeconds: 2_700 }),
      log({ id: 'recent', date: '2026-08-15', durationSeconds: 1_800 }),
      log({ id: 'month', date: '2026-07-25', durationSeconds: 3_600 }),
      log({ id: 'old', date: '2026-07-20', durationSeconds: 9_999 }),
    ];

    expect(buildRollingWorkoutSummary(logs, '2026-08-19', 7)).toEqual({
      totalSeconds: 4_500,
      activeDays: 2,
      logCount: 2,
    });
    expect(buildRollingWorkoutSummary(logs, '2026-08-19', 28)).toEqual({
      totalSeconds: 8_100,
      activeDays: 3,
      logCount: 3,
    });
  });

  it('builds a compact history item with workout time, exercise names, sets and reps', () => {
    expect(buildWorkoutLogHistoryItem(log({
      id: 'log-1',
      date: '2026-08-19',
      durationSeconds: 1_845,
      grantedPackIds: ['pack-1'],
      entries: [
        { exerciseId: 'squat', exerciseName: '스쿼트', sets: 3, reps: 10 },
        { exerciseId: 'run', exerciseName: '러닝', durationMinutes: 15 },
      ],
    }))).toMatchObject({
      id: 'log-1',
      date: '2026-08-19',
      durationSeconds: 1_845,
      exerciseNames: ['스쿼트', '러닝'],
      totalSets: 3,
      totalReps: 30,
      packCount: 1,
    });
  });
});
