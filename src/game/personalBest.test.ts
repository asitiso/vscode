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

describe('buildPersonalBestPreview', () => {
  const preview = () => (personalBest as unknown as {
    buildPersonalBestPreview?: (
      logs: WorkoutLog[],
      entry: WorkoutLog['entries'][number],
    ) => unknown;
  }).buildPersonalBestPreview;

  it('compares the entered weight with the previous best weight', () => {
    const buildPreview = preview();
    expect(typeof buildPreview).toBe('function');
    if (!buildPreview) return;

    expect(buildPreview([priorLog], {
      exerciseId: 'leg-press',
      exerciseName: '레그 프레스',
      weightKg: 65,
      reps: 8,
      sets: 3,
    })).toEqual({
      metric: 'weight',
      currentValue: 65,
      previousValue: 60,
      isNewRecord: true,
    });
  });

  it('uses duration for time-based exercise records', () => {
    const buildPreview = preview();
    expect(typeof buildPreview).toBe('function');
    if (!buildPreview) return;

    const durationLog: WorkoutLog = {
      ...priorLog,
      id: 'old-run',
      entries: [{ exerciseId: 'run', exerciseName: '러닝', exerciseLogType: 'duration', durationMinutes: 30 }],
    };

    expect(buildPreview([durationLog], {
      exerciseId: 'run',
      exerciseName: '러닝',
      exerciseLogType: 'duration',
      durationMinutes: 40,
    })).toEqual({
      metric: 'duration',
      currentValue: 40,
      previousValue: 30,
      isNewRecord: true,
    });
  });

  it('uses total repetitions for bodyweight records', () => {
    const buildPreview = preview();
    expect(typeof buildPreview).toBe('function');
    if (!buildPreview) return;

    const bodyweightLog: WorkoutLog = {
      ...priorLog,
      id: 'old-push-up',
      entries: [{ exerciseId: 'push-up', exerciseName: '푸시업', weightKg: 0, reps: 10, sets: 3 }],
    };

    expect(buildPreview([bodyweightLog], {
      exerciseId: 'push-up',
      exerciseName: '푸시업',
      weightKg: 0,
      reps: 12,
      sets: 3,
    })).toEqual({
      metric: 'reps',
      currentValue: 36,
      previousValue: 30,
      isNewRecord: true,
    });
  });
});
