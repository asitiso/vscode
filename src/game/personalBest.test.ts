import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import * as personalBest from './personalBest';

const priorLog: WorkoutLog = {
  id: 'old',
  date: '2026-08-18',
  entries: [{ exerciseId: 'leg-press', exerciseName: '레그 프레스', weightKg: 60, reps: 10, sets: 3 }],
  feeling: 'moderate',
  grantedPackIds: [],
  createdAt: '2026-08-18T03:00:00.000Z',
};

describe('detectWorkoutPersonalBests', () => {
  it('returns the exercise, metric and previous/current values for a new record', () => {
    const detector = (personalBest as unknown as {
      detectWorkoutPersonalBests?: (
        logs: WorkoutLog[],
        entries: WorkoutLog['entries'],
      ) => unknown[];
    }).detectWorkoutPersonalBests;

    expect(typeof detector).toBe('function');
    if (!detector) return;

    expect(detector([priorLog], [{
      exerciseId: 'leg-press',
      exerciseName: '레그 프레스',
      weightKg: 65,
      reps: 8,
      sets: 3,
    }])).toEqual([{
      exerciseId: 'leg-press',
      exerciseName: '레그 프레스',
      metric: 'weight',
      previousValue: 60,
      value: 65,
    }]);
  });
});
