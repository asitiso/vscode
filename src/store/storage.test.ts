import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState } from './storage';

describe('custom exercise storage migration', () => {
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
});
