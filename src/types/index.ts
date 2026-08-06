// 운동 일기 카드 수집 게임 — 핵심 데이터 타입 정의

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'abs'
  | 'cardio'
  | 'stretching'
  | 'etc';

export type ExerciseLogType = 'weight-reps-sets' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  logType: ExerciseLogType;
  characterAsset: string;
  linkedCardIds: string[];
}

export interface CustomExercise {
  id: string;
  name: string;
  category: 'etc';
  logType: ExerciseLogType;
  createdAt: string;
  updatedAt: string;
}

export type FeelingTag =
  | 'easy'
  | 'moderate'
  | 'hard'
  | 'personal-best'
  | 'good-condition'
  | 'bad-condition'
  | 'completed-anyway';

export interface WorkoutSetEntry {
  exerciseId: string;
  exerciseName?: string;
  exerciseLogType?: ExerciseLogType;
  weightKg?: number;
  reps?: number;
  sets?: number;
  durationMinutes?: number;
}

export interface WorkoutLog {
  id: string;
  date: string;
  entries: WorkoutSetEntry[];
  feeling: FeelingTag;
  memo?: string;
  grantedPackIds: string[];
  createdAt: string;
}

export type CardRarity = 'common' | 'rare' | 'super-rare' | 'legendary';

export interface CardDefinition {
  id: string;
  exerciseId: string;
  name: string;
  rarity: CardRarity;
  description: string;
  illustrationAsset: string;
  evolvedIllustrationAsset?: string;
}

export interface OwnedCard {
  cardId: string;
  count: number;
  starLevel: 1 | 2 | 3 | 4;
  firstObtainedAt: string;
  lastObtainedAt: string;
}

export const STAR_THRESHOLDS: Record<1 | 2 | 3 | 4, number> = {
  1: 1,
  2: 2,
  3: 5,
  4: 10,
};

export function calcStarLevel(count: number): 1 | 2 | 3 | 4 {
  if (count >= STAR_THRESHOLDS[4]) return 4;
  if (count >= STAR_THRESHOLDS[3]) return 3;
  if (count >= STAR_THRESHOLDS[2]) return 2;
  return 1;
}

export function pickDisplayIllustration(card: CardDefinition, starLevel: number): string {
  if (starLevel >= 4 && card.evolvedIllustrationAsset) return card.evolvedIllustrationAsset;
  return card.illustrationAsset;
}

export type PackType =
  | 'basic'
  | 'lower-body'
  | 'upper-body'
  | 'cardio'
  | 'full-body'
  | 'weekly-goal'
  | 'streak-reward'
  | 'special-challenge'
  | 'set-completion';

export interface PackDefinition {
  id: string;
  type: PackType;
  name: string;
  packAsset: string;
  favoredCategories: ExerciseCategory[];
}

export type PackSource = 'workout' | 'set-completion';

export interface GrantedPack {
  id: string;
  packDefId: string;
  grantedAt: string;
  openedAt?: string;
  resultCardId?: string;
  source?: PackSource;
  sourceSetId?: string;
}

export const RARITY_DROP_RATE: Record<CardRarity, number> = {
  common: 0.65,
  rare: 0.25,
  'super-rare': 0.09,
  legendary: 0.01,
};

export const SET_COMPLETION_DROP_RATE: Record<Exclude<CardRarity, 'common'>, number> = {
  rare: 0.7,
  'super-rare': 0.25,
  legendary: 0.05,
};

export const LEGENDARY_PITY_THRESHOLD = 20;

export interface WeeklyGoal {
  targetSessionsPerWeek: number;
}

export interface UserProfile {
  name: string;
  level: number;
  weeklyGoal: WeeklyGoal;
  weeklyStreak: number;
  legendaryPityCounter: number;
  selectedCharacterId: string;
  createdAt: string;
}

export interface AppState {
  user: UserProfile;
  workoutLogs: WorkoutLog[];
  ownedCards: Record<string, OwnedCard>;
  grantedPacks: GrantedPack[];
  customExercises: CustomExercise[];
  completedSetIds: string[];
  rewardedSetIds: string[];
  recentCompletedSetId?: string;
}
