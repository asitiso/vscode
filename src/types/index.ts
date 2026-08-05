// 운동 일기 카드 수집 게임 — 핵심 데이터 타입 정의
// CLAUDE.md 12절(개발 구현 지침), 21절(초기 버전 포함 기능) 기준

// ── 운동(Exercise) ─────────────────────────────────────────────

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

/** 기록 방식: 무게×횟수×세트 방식인지, 시간(유산소/스트레칭) 방식인지 */
export type ExerciseLogType = 'weight-reps-sets' | 'duration';

export interface Exercise {
  id: string;
  /** 표시용 이름은 UI 텍스트로 다국어 대응 — 이미지에 글자 넣지 않음 (CLAUDE.md 10절) */
  name: string;
  category: ExerciseCategory;
  logType: ExerciseLogType;
  /** assets/equipment/ 아래 캐릭터 PNG 파일명 (확장자 제외) */
  characterAsset: string;
  /** 이 운동으로 획득 확률이 오르는 카드 id 목록 */
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

// ── 오늘의 운동 기록(WorkoutLog) ───────────────────────────────

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
  /** 사용자 운동이 수정·삭제되어도 과거 기록에 표시할 스냅샷 */
  exerciseName?: string;
  exerciseLogType?: ExerciseLogType;
  /** weight-reps-sets 타입일 때 사용 */
  weightKg?: number;
  reps?: number;
  sets?: number;
  /** duration 타입일 때 사용 (분) */
  durationMinutes?: number;
}

export interface WorkoutLog {
  id: string;
  /** ISO 날짜 문자열 (YYYY-MM-DD) */
  date: string;
  entries: WorkoutSetEntry[];
  feeling: FeelingTag;
  memo?: string;
  /** 이 기록으로 지급된 카드팩 id */
  grantedPackIds: string[];
  createdAt: string;
}

// ── 카드(Card) ──────────────────────────────────────────────────

export type CardRarity = 'common' | 'rare' | 'super-rare' | 'legendary';

export interface CardDefinition {
  id: string;
  exerciseId: string;
  name: string;
  rarity: CardRarity;
  description: string;
  /** assets/cards/ 아래 캐릭터 일러스트 PNG (등급별로 재사용 가능) */
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

// ── 카드팩(Pack) ────────────────────────────────────────────────

export type PackType =
  | 'basic'
  | 'lower-body'
  | 'upper-body'
  | 'cardio'
  | 'full-body'
  | 'weekly-goal'
  | 'streak-reward'
  | 'special-challenge';

export interface PackDefinition {
  id: string;
  type: PackType;
  name: string;
  packAsset: string;
  favoredCategories: ExerciseCategory[];
}

export interface GrantedPack {
  id: string;
  packDefId: string;
  grantedAt: string;
  openedAt?: string;
  resultCardId?: string;
}

export const RARITY_DROP_RATE: Record<CardRarity, number> = {
  common: 0.65,
  rare: 0.25,
  'super-rare': 0.09,
  legendary: 0.01,
};

export const LEGENDARY_PITY_THRESHOLD = 20;

// ── 사용자 진행 상태(UserProfile) ──────────────────────────────

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

// ── 전체 저장 상태(AppState) ────────────────────────────────────

export interface AppState {
  user: UserProfile;
  workoutLogs: WorkoutLog[];
  ownedCards: Record<string, OwnedCard>;
  grantedPacks: GrantedPack[];
  customExercises: CustomExercise[];
}
