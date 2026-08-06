import type { OwnedCard } from '../types';

export interface CardSetDefinition {
  id: string;
  name: string;
  shortLabel: string;
  title: string;
  cardIds: [string, string, string, string];
}

export interface CardSetProgress {
  set: CardSetDefinition;
  ownedCount: number;
  totalCount: number;
  missingCardIds: string[];
  complete: boolean;
}

export const CARD_SETS: CardSetDefinition[] = [
  {
    id: 'cardio-starter',
    name: '유산소 스타터',
    shortLabel: '유산소',
    title: '심장이 뛴다',
    cardIds: ['card-treadmill', 'card-stationary-bike', 'card-stair-climber', 'card-rowing-machine'],
  },
  {
    id: 'lower-body-machines',
    name: '하체 머신',
    shortLabel: '하체',
    title: '튼튼한 하체',
    cardIds: ['card-leg-press', 'card-leg-extension', 'card-leg-curl', 'card-squat-rack'],
  },
  {
    id: 'chest-strength',
    name: '가슴 강화',
    shortLabel: '가슴',
    title: '강철 가슴',
    cardIds: ['card-chest-press', 'card-pec-deck-fly', 'card-incline-bench-press', 'card-dip-station'],
  },
  {
    id: 'back-pull',
    name: '등 당기기',
    shortLabel: '등',
    title: '등이 말한다',
    cardIds: ['card-lat-pulldown', 'card-seated-row', 'card-pull-up-bar', 'card-cable-machine'],
  },
  {
    id: 'free-weights',
    name: '프리웨이트',
    shortLabel: '프리웨이트',
    title: '철을 다루는 자',
    cardIds: ['card-dumbbell', 'card-barbell', 'card-kettlebell', 'card-smith-machine'],
  },
  {
    id: 'full-body-balance',
    name: '전신 밸런스',
    shortLabel: '전신 밸런스',
    title: '균형의 달인',
    cardIds: ['card-shoulder-press', 'card-ab-crunch-machine', 'card-stretching-mat', 'card-foam-roller'],
  },
];

export const CARD_SETS_BY_ID: Record<string, CardSetDefinition> = Object.fromEntries(
  CARD_SETS.map((set) => [set.id, set]),
);

export function getCardSetProgress(
  set: CardSetDefinition,
  ownedCards: Record<string, OwnedCard>,
): CardSetProgress {
  const missingCardIds = set.cardIds.filter((cardId) => !ownedCards[cardId]);
  return {
    set,
    ownedCount: set.cardIds.length - missingCardIds.length,
    totalCount: set.cardIds.length,
    missingCardIds,
    complete: missingCardIds.length === 0,
  };
}

export function getAllCardSetProgress(
  ownedCards: Record<string, OwnedCard>,
): CardSetProgress[] {
  return CARD_SETS.map((set) => getCardSetProgress(set, ownedCards));
}

export function getNewlyCompletedSetIds(
  before: Record<string, OwnedCard>,
  after: Record<string, OwnedCard>,
  rewardedSetIds: string[],
): string[] {
  const rewarded = new Set(rewardedSetIds);
  return CARD_SETS.filter((set) => {
    if (rewarded.has(set.id)) return false;
    return !getCardSetProgress(set, before).complete && getCardSetProgress(set, after).complete;
  }).map((set) => set.id);
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyCardSet(dateKey: string): CardSetDefinition {
  let hash = 2166136261;
  for (const char of dateKey) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return CARD_SETS[Math.abs(hash) % CARD_SETS.length];
}

export function selectFeaturedProgress(
  ownedCards: Record<string, OwnedCard>,
  dailySetId: string,
): CardSetProgress {
  const progress = getAllCardSetProgress(ownedCards);
  const incomplete = progress.filter((item) => !item.complete);
  if (incomplete.length === 0) {
    return progress.find((item) => item.set.id === dailySetId) ?? progress[0];
  }
  if (incomplete.every((item) => item.ownedCount === 0)) {
    return incomplete.find((item) => item.set.id === dailySetId) ?? incomplete[0];
  }
  return [...incomplete].sort((a, b) => {
    const remainingDifference = a.missingCardIds.length - b.missingCardIds.length;
    if (remainingDifference !== 0) return remainingDifference;
    if (a.set.id === dailySetId) return -1;
    if (b.set.id === dailySetId) return 1;
    return CARD_SETS.indexOf(a.set) - CARD_SETS.indexOf(b.set);
  })[0];
}

export function findSetForCard(cardId: string): CardSetDefinition | undefined {
  return CARD_SETS.find((set) => set.cardIds.includes(cardId));
}
