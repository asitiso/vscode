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

  it('초기 상태에 빈 일일 미션 맵을 포함한다', () => {
    expect(createInitialState().dailyMissions).toEqual({});
  });

  it('이전 저장 데이터에 dailyMissions가 없으면 빈 객체를 채운다', () => {
    const oldState = { ...createInitialState() } as Partial<ReturnType<typeof createInitialState>>;
    delete oldState.dailyMissions;
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.dailyMissions).toEqual({});
  });
});
