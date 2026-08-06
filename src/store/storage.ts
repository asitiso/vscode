import type { AppState, GrantedPack } from '../types';

const STORAGE_KEY = 'workout-card-game:v1';
export const STATE_SCHEMA_VERSION = 1;

type LegacyGrantedPack = Omit<GrantedPack, 'source'> & { source?: string; sourceMissionId?: string };
type LegacyAppState = Omit<AppState, 'grantedPacks'> & {
  grantedPacks: LegacyGrantedPack[];
  dailyMissions?: unknown;
};

export interface SavedStateEnvelope {
  state: AppState;
  savedAt: string;
  schemaVersion: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateState(parsed: LegacyAppState): AppState {
  if (!parsed.user.selectedCharacterId) parsed.user.selectedCharacterId = 'main-character';
  if (!Array.isArray(parsed.customExercises)) parsed.customExercises = [];
  if (!Array.isArray(parsed.completedSetIds)) parsed.completedSetIds = [];
  if (!Array.isArray(parsed.rewardedSetIds)) parsed.rewardedSetIds = [];
  if (!Array.isArray(parsed.grantedPacks)) parsed.grantedPacks = [];
  const grantedPacks: GrantedPack[] = parsed.grantedPacks
    .filter((pack) => pack.source !== 'daily-mission' && pack.packDefId !== 'pack-daily-mission')
    .map(({ sourceMissionId: _sourceMissionId, ...pack }) => ({
      ...pack,
      source: pack.source === 'set-completion' ? 'set-completion' : 'workout',
    }));
  const { dailyMissions: _legacyDailyMissions, ...state } = parsed;
  return { ...state, grantedPacks };
}

export function normalizeAppState(value: unknown): AppState {
  if (!isRecord(value) || !isRecord(value.user)) throw new Error('invalid app state');
  if (!Array.isArray(value.workoutLogs) || !isRecord(value.ownedCards)) {
    throw new Error('invalid app state');
  }
  if (!Array.isArray(value.grantedPacks)) throw new Error('invalid app state');
  return migrateState(value as LegacyAppState);
}

export function loadStateEnvelope(): SavedStateEnvelope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (isRecord(parsed) && 'state' in parsed && typeof parsed.savedAt === 'string') {
      return {
        state: normalizeAppState(parsed.state),
        savedAt: parsed.savedAt,
        schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : STATE_SCHEMA_VERSION,
      };
    }

    return {
      state: normalizeAppState(parsed),
      savedAt: new Date(0).toISOString(),
      schemaVersion: STATE_SCHEMA_VERSION,
    };
  } catch (err) {
    console.warn('저장된 데이터를 불러오지 못했습니다.', err);
    return null;
  }
}

export function loadState(): AppState | null {
  return loadStateEnvelope()?.state ?? null;
}

export function saveState(state: AppState, savedAt = new Date().toISOString()): SavedStateEnvelope {
  const envelope: SavedStateEnvelope = {
    state,
    savedAt,
    schemaVersion: STATE_SCHEMA_VERSION,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (err) {
    console.warn('데이터 저장에 실패했습니다.', err);
  }
  return envelope;
}

export function replaceLocalState(value: unknown, savedAt = new Date().toISOString()): SavedStateEnvelope {
  return saveState(normalizeAppState(value), savedAt);
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
    completedSetIds: [],
    rewardedSetIds: [],
  };
}
