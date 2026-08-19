import { describe, expect, it } from 'vitest';
import type { AppState, WorkoutLog } from '../types';
import { calculateExperienceProgress, calculateLevelFromXp } from './experience';

function workout(index: number): WorkoutLog {
  return {
    id: `log-${index}`,
    date: `2026-08-${String(index + 1).padStart(2, '0')}`,
    entries: [],
    feeling: 'moderate',
    grantedPackIds: [],
    createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
  };
}

function stateWithWorkouts(count: number): AppState {
  return {
    user: {
      name: '테스트',
      level: 1,
      weeklyGoal: { targetSessionsPerWeek: 99 },
      weeklyStreak: 0,
      legendaryPityCounter: 0,
      selectedCharacterId: 'main-character',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    workoutLogs: Array.from({ length: count }, (_, index) => workout(index)),
    ownedCards: {},
    grantedPacks: [],
    customExercises: [],
    completedSetIds: [],
    rewardedSetIds: [],
    claimedLevelMilestones: [],
    earnedBadges: [],
    unlockedCosmetics: [],
  };
}

describe('experience level', () => {
  it('누적 경험치가 500 XP에 도달하면 2레벨이 된다', () => {
    expect(calculateLevelFromXp(499)).toBe(1);
    expect(calculateLevelFromXp(500)).toBe(2);
  });

  it('저장된 user.level이 오래된 값이어도 실제 경험치로 레벨을 계산한다', () => {
    const progress = calculateExperienceProgress(stateWithWorkouts(5));

    expect(progress.totalXp).toBe(500);
    expect(progress.level).toBe(2);
    expect(progress.currentLevelXp).toBe(0);
    expect(progress.requiredXp).toBe(1000);
  });

  it('같은 날 여러 운동을 기록해도 주간 목표 XP는 하루 한 번만 계산한다', () => {
    const state = stateWithWorkouts(3);
    state.user.weeklyGoal.targetSessionsPerWeek = 3;
    state.workoutLogs = state.workoutLogs.map((item, index) => ({
      ...item,
      id: `same-day-${index}`,
      date: '2026-08-17',
    }));

    const progress = calculateExperienceProgress(state);

    expect(progress.workoutXp).toBe(300);
    expect(progress.weeklyGoalXp).toBe(0);
  });

  it('자동 감지된 신기록은 종목 수와 무관하게 운동 1회당 50 XP만 준다', () => {
    const state = stateWithWorkouts(1);
    state.workoutLogs[0] = {
      ...state.workoutLogs[0],
      personalBestExerciseIds: ['leg-press', 'run'],
    };

    expect(calculateExperienceProgress(state).personalBestXp).toBe(50);
  });

  it('새 형식 로그는 수동 personal-best 느낌만으로 XP를 주지 않는다', () => {
    const state = stateWithWorkouts(1);
    state.workoutLogs[0] = {
      ...state.workoutLogs[0],
      feeling: 'personal-best',
      personalBestExerciseIds: [],
    };

    expect(calculateExperienceProgress(state).personalBestXp).toBe(0);
  });

  it('기존 저장 데이터의 personal-best 느낌 XP는 그대로 보존한다', () => {
    const state = stateWithWorkouts(1);
    state.workoutLogs[0] = {
      ...state.workoutLogs[0],
      feeling: 'personal-best',
    };
    delete state.workoutLogs[0].personalBestExerciseIds;

    expect(calculateExperienceProgress(state).personalBestXp).toBe(50);
  });
});
