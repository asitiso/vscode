import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { buildExerciseAnalysis, buildExerciseHistory, buildExerciseTrend } from './exerciseAnalysis';

const log = (id: string, date: string, entries: WorkoutLog['entries'], createdAt = `${date}T09:00:00.000Z`): WorkoutLog => ({
  id,
  date,
  entries,
  feeling: 'moderate',
  grantedPackIds: [],
  createdAt,
});

describe('buildExerciseHistory', () => {
  it('keeps separate performances from different logs on the same day', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 40, sets: 3, reps: 10 }]),
      log('b', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 45, sets: 2, reps: 8 }], '2026-08-05T11:00:00.000Z'),
    ], 'leg-press');
    expect(records).toHaveLength(2);
    expect(records[0].weightKg).toBe(45);
  });

  it('preserves a deleted custom exercise name', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-05', [{ exerciseId: 'custom-gone', exerciseName: '힙 밴드 걷기', durationMinutes: 15 }]),
    ], 'custom-gone');
    expect(records[0].exerciseName).toBe('힙 밴드 걷기');
    expect(records[0].category).toBe('etc');
  });

  it('places invalid stored dates after valid dates', () => {
    const records = buildExerciseHistory([
      log('bad', 'not-a-date', [{ exerciseId: 'leg-press', sets: 1, reps: 1 }], '2026-08-06T09:00:00.000Z'),
      log('good', '2026-08-05', [{ exerciseId: 'leg-press', sets: 1, reps: 1 }]),
    ], 'leg-press');
    expect(records.map((record) => record.logId)).toEqual(['good', 'bad']);
  });
});

describe('buildExerciseAnalysis', () => {
  it('separates active days from record count and computes personal bests', () => {
    const analysis = buildExerciseAnalysis([
      log('a', '2026-08-04', [{ exerciseId: 'leg-press', weightKg: 40, sets: 3, reps: 10 }]),
      log('b', '2026-08-04', [{ exerciseId: 'leg-press', weightKg: 50, sets: 2, reps: 8 }]),
      log('c', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 45, sets: 4, reps: 12 }]),
    ], 'leg-press');
    expect(analysis?.totals).toMatchObject({ activeDays: 2, recordCount: 3, sets: 9, reps: 94 });
    expect(analysis?.personalBests.maxWeightKg).toBe(50);
    expect(analysis?.personalBests.maxReps).toBe(48);
  });

  it('returns null when there is no matching record', () => {
    expect(buildExerciseAnalysis([], 'missing')).toBeNull();
  });
});

describe('buildExerciseTrend', () => {
  it('prioritizes weight and returns the latest four points in chronological order', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-01', [{ exerciseId: 'leg-press', sets: 3, reps: 10 }]),
      log('b', '2026-08-02', [{ exerciseId: 'leg-press', weightKg: 50, sets: 3, reps: 10 }]),
    ], 'leg-press');
    const trend = buildExerciseTrend(records);
    expect(trend.metric).toBe('weight');
    expect(trend.points.map((point) => point.value)).toEqual([0, 50]);
  });
});
