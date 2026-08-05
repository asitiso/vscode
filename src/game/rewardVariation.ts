import { STAR_THRESHOLDS, calcStarLevel } from '../types';

export type RewardVariantId = 'calm-rise' | 'power-burst' | 'mystery-pulse';
export type RewardCopyPhase = 'ready' | 'charging' | 'burst';

export interface RewardVariant {
  id: RewardVariantId;
  label: string;
  className: string;
  soundPitch: number;
  copy: Record<RewardCopyPhase, readonly string[]>;
}

export interface CardGrowthProgress {
  currentCount: number;
  currentStar: 1 | 2 | 3 | 4;
  nextStar: 2 | 3 | 4 | null;
  nextThreshold: number;
  remaining: number;
  progressPercent: number;
  isMax: boolean;
}

export const REWARD_VARIANTS: readonly RewardVariant[] = [
  {
    id: 'calm-rise',
    label: '빛이 차오르는 개봉',
    className: 'reward-v5--calm-rise',
    soundPitch: 0.96,
    copy: {
      ready: ['조용한 빛이 카드팩에 모이고 있어요', '오늘의 운동 에너지가 깨어납니다'],
      charging: ['빛을 끝까지 끌어올리는 중', '보상 에너지가 차분히 차오릅니다'],
      burst: ['빛의 문이 열립니다!', '새로운 친구가 모습을 드러냅니다!'],
    },
  },
  {
    id: 'power-burst',
    label: '파워 폭발 개봉',
    className: 'reward-v5--power-burst',
    soundPitch: 1.08,
    copy: {
      ready: ['강력한 보상이 도착했어요!', '운동 파워를 한 번에 폭발시켜요'],
      charging: ['파워 게이지가 한계까지 상승 중', '조금만 더! 곧 폭발합니다'],
      burst: ['파워 오픈!', '운동 에너지 대폭발!'],
    },
  },
  {
    id: 'mystery-pulse',
    label: '미스터리 파동 개봉',
    className: 'reward-v5--mystery-pulse',
    soundPitch: 1.02,
    copy: {
      ready: ['카드팩 안에서 수상한 파동이 느껴져요', '이번 팩은 뭔가 분위기가 달라요'],
      charging: ['정체불명의 신호를 해독하는 중', '숨겨진 보상이 가까워집니다'],
      burst: ['비밀이 공개됩니다!', '미스터리 신호 포착!'],
    },
  },
] as const;

export function selectRewardVariant(
  previousId: RewardVariantId | null,
  randomValue = Math.random(),
): RewardVariant {
  const candidates = previousId
    ? REWARD_VARIANTS.filter((variant) => variant.id !== previousId)
    : [...REWARD_VARIANTS];
  const normalized = Math.max(0, Math.min(0.999999, randomValue));
  return candidates[Math.floor(normalized * candidates.length)] ?? REWARD_VARIANTS[0];
}

export function getRewardCopy(
  variant: RewardVariant,
  phase: RewardCopyPhase,
  seed = 0,
): string {
  const options = variant.copy[phase];
  return options[Math.abs(seed) % options.length] ?? options[0];
}

export function getCardGrowthProgress(count: number): CardGrowthProgress {
  const safeCount = Math.max(1, Math.floor(count));
  const currentStar = calcStarLevel(safeCount);

  if (currentStar === 4) {
    return {
      currentCount: safeCount,
      currentStar,
      nextStar: null,
      nextThreshold: STAR_THRESHOLDS[4],
      remaining: 0,
      progressPercent: 100,
      isMax: true,
    };
  }

  const nextStar = (currentStar + 1) as 2 | 3 | 4;
  const currentThreshold = STAR_THRESHOLDS[currentStar];
  const nextThreshold = STAR_THRESHOLDS[nextStar];
  const progressWithinLevel = safeCount - currentThreshold;
  const levelSpan = nextThreshold - currentThreshold;

  return {
    currentCount: safeCount,
    currentStar,
    nextStar,
    nextThreshold,
    remaining: Math.max(0, nextThreshold - safeCount),
    progressPercent: Math.round((progressWithinLevel / levelSpan) * 100),
    isMax: false,
  };
}
