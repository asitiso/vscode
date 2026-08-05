import type { AppState } from '../types';

const STORAGE_KEY = 'workout-card-game:v1';

export function migrateState(parsed: AppState): AppState {
  if (!parsed.user.selectedCharacterId) {
    parsed.user.selectedCharacterId = 'main-character';
  }
  if (!Array.isArray(parsed.customExercises)) {
    parsed.customExercises = [];
  }
  return parsed;
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateState(JSON.parse(raw) as AppState);
  } catch (err) {
    console.warn('저장된 데이터를 불러오지 못했습니다.', err);
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('데이터 저장에 실패했습니다.', err);
  }
}

export function createInitialState(): AppState {
  const now = new Date().toISOString();
  return {
    user: {
      name: '헬스 초보',
      level: 1,
      weeklyGoal: { targetSessionsPerWeek: 3 },
      weeklyStreak: 0,
      legendaryPityCounter: 0,
      selectedCharacterId: 'main-character',
      createdAt: now,
    },
    workoutLogs: [],
    ownedCards: {},
    grantedPacks: [],
    customExercises: [],
  };
}
