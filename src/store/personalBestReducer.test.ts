import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../types';
import { gameReducer } from './GameContext';
import { createInitialState } from './storage';

type WorkoutLogWithPersonalBest = WorkoutLog & { personalBestExerciseIds?: string[] };

function priorLog(id: string, date: string, entry: WorkoutLog['entries'][number]): WorkoutLog {
  return {
    id,
    date,
    entries: [entry],
    feeling: 'moderate',
    grantedPackIds: [],
    createdAt: `${date}T03:00:00.000Z`,
  };
}

function latestPersonalBestIds(logs: WorkoutLog[]): string[] | undefined {
  return (logs.at(-1) as WorkoutLogWithPersonalBest | undefined)?.personalBestExerciseIds;
}

describe('automatic personal best detection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00+09:00'));
  });

  afterEach(() => vi.useRealTimers());

  it('does not call the first comparable record a personal best', () => {
    const state = createInitialState();
    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'leg-press', weightKg: 60, reps: 10, sets: 3 }],
      feeling: 'moderate',
    });

    expect(latestPersonalBestIds(next.workoutLogs)).toEqual([]);
  });

  it('marks a strictly higher weight as a personal best', () => {
    const state = createInitialState();
    state.workoutLogs = [priorLog('old', '2026-08-18', {
      exerciseId: 'leg-press', weightKg: 60, reps: 10, sets: 3,
    })];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'leg-press', weightKg: 65, reps: 8, sets: 3 }],
      feeling: 'moderate',
    });

    expect(latestPersonalBestIds(next.workoutLogs)).toEqual(['leg-press']);
  });

  it('does not mark an equal weight as a personal best', () => {
    const state = createInitialState();
    state.workoutLogs = [priorLog('old', '2026-08-18', {
      exerciseId: 'leg-press', weightKg: 60, reps: 10, sets: 3,
    })];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'leg-press', weightKg: 60, reps: 12, sets: 3 }],
      feeling: 'moderate',
    });

    expect(latestPersonalBestIds(next.workoutLogs)).toEqual([]);
  });

  it('uses duration for time-based exercise personal bests', () => {
    const state = createInitialState();
    state.workoutLogs = [priorLog('old', '2026-08-18', {
      exerciseId: 'run', exerciseLogType: 'duration', durationMinutes: 30,
    })];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'run', exerciseLogType: 'duration', durationMinutes: 35 }],
      feeling: 'moderate',
    });

    expect(latestPersonalBestIds(next.workoutLogs)).toEqual(['run']);
  });

  it('uses total repetitions when a strength entry has zero weight', () => {
    const state = createInitialState();
    state.workoutLogs = [priorLog('old', '2026-08-18', {
      exerciseId: 'push-up', weightKg: 0, reps: 10, sets: 3,
    })];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'push-up', weightKg: 0, reps: 12, sets: 3 }],
      feeling: 'moderate',
    });

    expect(latestPersonalBestIds(next.workoutLogs)).toEqual(['push-up']);
  });
});
