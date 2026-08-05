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

// ── 오늘의 운동 기록(WorkoutLog) ───────────────────────────────

export type FeelingTag =
  | 'easy'          // 가볍게 완료
  | 'moderate'      // 적당히 힘들었음
  | 'hard'          // 정말 힘들었음
  | 'personal-best' // 기록을 경신함
  | 'good-condition'// 컨디션이 좋았음
  | 'bad-condition' // 컨디션이 좋지 않았음
  | 'completed-anyway'; // 그래도 운동 완료

export interface WorkoutSetEntry {
  exerciseId: string;
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
  createdAt: string; // ISO datetime
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
  /**
   * 중복 10장(4성) 달성 시 해금되는 "업그레이드" 특별 일러스트 (CLAUDE.md 4-3절).
   * 같은 기구가 더 멋진 모습으로 진화한 버전. 없으면 기본 illustrationAsset을 계속 사용.
   */
  evolvedIllustrationAsset?: string;
}

/** 사용자가 실제로 보유한 카드의 진행 상태 (도감 엔트리) */
export interface OwnedCard {
  cardId: string;
  /** 중복 포함 총 획득 매수 */
  count: number;
  /** 별 등급: count 기준으로 계산 (1/2/3/4성) */
  starLevel: 1 | 2 | 3 | 4;
  firstObtainedAt: string; // ISO datetime
  lastObtainedAt: string;  // ISO datetime
}

// 별 성장 기준 (CLAUDE.md 4-3절)
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

/** 도감/개봉 화면 등에서 실제로 표시할 일러스트를 고른다 — 4성이면 업그레이드 일러스트. */
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
  /** assets/packs/ 아래 카드팩 PNG */
  packAsset: string;
  /** 이 팩이 우대하는 카테고리 (비어있으면 전체 랜덤) */
  favoredCategories: ExerciseCategory[];
}

/** 실제 사용자에게 지급된, 아직 개봉하지 않은 카드팩 인스턴스 */
export interface GrantedPack {
  id: string;
  packDefId: string;
  grantedAt: string; // ISO datetime
  openedAt?: string; // 개봉 시 채워짐
  /** 개봉 결과로 나온 카드 id */
  resultCardId?: string;
}

export const RARITY_DROP_RATE: Record<CardRarity, number> = {
  common: 0.65,
  rare: 0.25,
  'super-rare': 0.09,
  legendary: 0.01,
};

/** 천장 시스템: 이 팩 수를 넘도록 레전드가 안 나오면 확률 보정 시작 (CLAUDE.md 5절) */
export const LEGENDARY_PITY_THRESHOLD = 20;

// ── 사용자 진행 상태(UserProfile) ──────────────────────────────

export interface WeeklyGoal {
  /** 주당 목표 운동 횟수 */
  targetSessionsPerWeek: number;
}

export interface UserProfile {
  name: string;
  level: number;
  weeklyGoal: WeeklyGoal;
  /** 연속 "주간 목표 달성" 주 수 — 매일 출석이 아닌 주간 단위로 계산 (CLAUDE.md 3-4절) */
  weeklyStreak: number;
  /** 레전드 미획득 연속 팩 카운트 (천장 시스템용) */
  legendaryPityCounter: number;
  /** 홈 화면에 표시할 마스코트 캐릭터 (assetManifest의 SELECTABLE_CHARACTERS 중 하나) */
  selectedCharacterId: string;
  createdAt: string; // ISO datetime
}

// ── 전체 저장 상태(AppState) ────────────────────────────────────

export interface AppState {
  user: UserProfile;
  workoutLogs: WorkoutLog[];
  ownedCards: Record<string, OwnedCard>; // key: cardId
  grantedPacks: GrantedPack[]; // 미개봉 + 개봉 이력 모두 포함
}
