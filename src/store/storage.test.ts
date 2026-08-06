import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState } from './storage';

describe('storage migration', () => {
  beforeEach(() => localStorage.clear());

  it('초기 상태에 빈 사용자 운동 목록을 포함한다', () => {
    expect(createInitialState().customExercises).toEqual([]);
  });

  it('이전 저장 데이터에 customExercises가 없으면 빈 배열을 채운다', () => {
    const oldState = { ...createInitialState() } as Partial<ReturnType<typeof createInitialState>>;
    delete oldState.customExercises;
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.customExercises).toEqual([]);
  });

  it('기존 dailyMissions 필드는 무시하고 다른 데이터를 유지한다', () => {
    const oldState = {
      ...createInitialState(),
      dailyMissions: { '2026-08-06': { selectedMissionId: 'legacy' } },
    };
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    const loaded = loadState();
    expect(loaded?.workoutLogs).toEqual([]);
    expect('dailyMissions' in (loaded ?? {})).toBe(false);
  });

  it('기존 미션 보상팩은 제거한다', () => {
    const oldState = {
      ...createInitialState(),
      grantedPacks: [
        {
          id: 'legacy-mission-pack',
          packDefId: 'pack-daily-mission',
          grantedAt: '2026-08-06T00:00:00.000Z',
          source: 'daily-mission',
        },
      ],
    };
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.grantedPacks).toEqual([]);
  });
});
