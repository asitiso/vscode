import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from './GameContext';
import { createInitialState } from './storage';
import type { WorkoutLog, WorkoutSetEntry } from '../types';

function priorLog(id: string, date: string): WorkoutLog {
  return {
    id,
    date,
    entries: [],
    feeling: 'moderate',
    grantedPackIds: [],
    createdAt: `${date}T03:00:00.000Z`,
  };
}

const entry: WorkoutSetEntry = {
  exerciseId: 'squat',
  exerciseName: '스쿼트',
  exerciseLogType: 'weight-reps-sets',
  weightKg: 60,
  reps: 10,
  sets: 3,
};

describe('weekly goal reward grant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T19:30:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('grants one weekly-goal pack exactly when a new active day completes 3/3', () => {
    const initial = createInitialState();
    initial.workoutLogs = [
      priorLog('mon', '2026-08-17'),
      priorLog('tue', '2026-08-18'),
    ];

    const next = gameReducer(initial, {
      type: 'COMPLETE_WORKOUT',
      entries: [entry],
      feeling: 'moderate',
      durationSeconds: 1800,
    });

    const weeklyPacks = next.grantedPacks.filter((pack) => pack.source === 'weekly-goal');
    const workoutPacks = next.grantedPacks.filter((pack) => pack.source === 'workout');

    expect(weeklyPacks).toHaveLength(1);
    expect(weeklyPacks[0].packDefId).toBe('pack-weekly-goal');
    expect(weeklyPacks[0].sourceWeekKey).toBe('2026-W34');
    expect(workoutPacks).toHaveLength(1);
    expect(next.workoutLogs.at(-1)?.grantedPackIds).toEqual(
      expect.arrayContaining([workoutPacks[0].id, weeklyPacks[0].id]),
    );
  });

  it('does not grant the weekly-goal pack again for another workout on the same day', () => {
    const initial = createInitialState();
    initial.workoutLogs = [
      priorLog('mon', '2026-08-17'),
      priorLog('tue', '2026-08-18'),
    ];

    const completed = gameReducer(initial, {
      type: 'COMPLETE_WORKOUT',
      entries: [entry],
      feeling: 'moderate',
    });
    const repeated = gameReducer(completed, {
      type: 'COMPLETE_WORKOUT',
      entries: [entry],
      feeling: 'hard',
    });

    expect(repeated.grantedPacks.filter((pack) => pack.source === 'weekly-goal')).toHaveLength(1);
    expect(repeated.grantedPacks.filter((pack) => pack.source === 'workout')).toHaveLength(2);
  });
});
