import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../types';
import { gameReducer } from '../store/GameContext';
import { createInitialState } from '../store/storage';
import { getWeekKey } from './weeklyGoal';

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

describe('weekly goal reward pack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00+09:00'));
  });

  afterEach(() => vi.useRealTimers());

  it('grants one weekly-goal pack when a new active day first reaches the target', () => {
    const state = createInitialState();
    state.user.weeklyGoal.targetSessionsPerWeek = 3;
    state.workoutLogs = [priorLog('mon', '2026-08-17'), priorLog('tue', '2026-08-18')];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'squat', sets: 3, reps: 10 }],
      feeling: 'moderate',
    });

    const weekKey = getWeekKey('2026-08-19');
    const weeklyPacks = next.grantedPacks.filter((pack) => pack.source === 'weekly-goal');
    expect(weeklyPacks).toHaveLength(1);
    expect(weeklyPacks[0]).toEqual(expect.objectContaining({
      packDefId: 'pack-weekly-goal',
      source: 'weekly-goal',
      sourceWeekKey: weekKey,
    }));
    expect(next.workoutLogs.at(-1)?.grantedPackIds).toContain(weeklyPacks[0].id);
  });

  it('does not grant the weekly reward from another workout on a day already counted', () => {
    const state = createInitialState();
    state.user.weeklyGoal.targetSessionsPerWeek = 3;
    state.workoutLogs = [
      priorLog('mon', '2026-08-17'),
      priorLog('tue', '2026-08-18'),
      priorLog('wed-first', '2026-08-19'),
    ];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'run', durationMinutes: 20 }],
      feeling: 'moderate',
    });

    expect(next.grantedPacks.filter((pack) => pack.source === 'weekly-goal')).toHaveLength(0);
  });

  it('never grants a second weekly reward for a week that already has one', () => {
    const state = createInitialState();
    const weekKey = getWeekKey('2026-08-19');
    state.user.weeklyGoal.targetSessionsPerWeek = 3;
    state.workoutLogs = [priorLog('mon', '2026-08-17'), priorLog('tue', '2026-08-18')];
    state.grantedPacks = [{
      id: `weekly-goal-${weekKey}`,
      packDefId: 'pack-weekly-goal',
      grantedAt: '2026-08-18T03:00:00.000Z',
      source: 'weekly-goal',
      sourceWeekKey: weekKey,
    }];

    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'squat', sets: 3, reps: 10 }],
      feeling: 'moderate',
    });

    expect(next.grantedPacks.filter((pack) => pack.source === 'weekly-goal')).toHaveLength(1);
  });
});
