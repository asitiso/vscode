import { describe, expect, it } from 'vitest';
import { createInitialState } from './storage';
import { gameReducer } from './GameContext';

describe('workout duration reducer', () => {
  it('stores an optional completed session duration on the workout log', () => {
    const state = createInitialState();
    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'push-up', exerciseName: '푸시업', exerciseLogType: 'weight-reps-sets', reps: 12, sets: 3 }],
      feeling: 'moderate',
      durationSeconds: 1938,
    });

    expect(next.workoutLogs).toHaveLength(1);
    expect(next.workoutLogs[0].durationSeconds).toBe(1938);
  });

  it('keeps duration optional for older/manual workout records', () => {
    const state = createInitialState();
    const next = gameReducer(state, {
      type: 'COMPLETE_WORKOUT',
      entries: [{ exerciseId: 'push-up', exerciseName: '푸시업', exerciseLogType: 'weight-reps-sets', reps: 12, sets: 3 }],
      feeling: 'easy',
    });

    expect(next.workoutLogs[0].durationSeconds).toBeUndefined();
  });
});
