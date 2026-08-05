import { CARDS_BY_RARITY } from '../data/cards';
import { EXERCISES_BY_ID } from '../data/exercises';
import {
  LEGENDARY_PITY_THRESHOLD,
  RARITY_DROP_RATE,
  type CardDefinition,
  type CardRarity,
  type ExerciseCategory,
  type WorkoutSetEntry,
} from '../types';

/**
 * 오늘 기록한 운동 종목들로부터 관련 카테고리 집합을 구한다.
 * 기본 운동 정의에 없는 사용자 운동은 기타 카테고리로 처리한다.
 */
export function categoriesFromEntries(entries: WorkoutSetEntry[]): ExerciseCategory[] {
  const set = new Set<ExerciseCategory>();
  for (const entry of entries) {
    const exercise = EXERCISES_BY_ID[entry.exerciseId];
    set.add(exercise?.category ?? 'etc');
  }
  return [...set];
}

function rollRarity(pityBoost: boolean): CardRarity {
  const rates: Record<CardRarity, number> = pityBoost
    ? {
        legendary: 0.2,
        'super-rare': RARITY_DROP_RATE['super-rare'] * 0.9,
        rare: RARITY_DROP_RATE.rare * 0.9,
        common: RARITY_DROP_RATE.common * 0.9,
      }
    : RARITY_DROP_RATE;

  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (const rarity of ['legendary', 'super-rare', 'rare', 'common'] as CardRarity[]) {
    roll -= rates[rarity];
    if (roll <= 0) return rarity;
  }
  return 'common';
}

function pickCardFromRarity(rarity: CardRarity, relatedCategories: ExerciseCategory[]): CardDefinition {
  const pool = CARDS_BY_RARITY[rarity];
  if (pool.length === 0) {
    const all = Object.values(CARDS_BY_RARITY).flat();
    return all[Math.floor(Math.random() * all.length)];
  }

  const related = pool.filter((c) => {
    const exercise = EXERCISES_BY_ID[c.exerciseId];
    return exercise && relatedCategories.includes(exercise.category);
  });

  const weighted: CardDefinition[] = [];
  for (const card of pool) {
    const weight = related.includes(card) ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(card);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

export interface DrawResult {
  card: CardDefinition;
  pityTriggered: boolean;
}

export function drawCard(
  relatedCategories: ExerciseCategory[],
  legendaryPityCounter: number,
): DrawResult {
  const pityTriggered = legendaryPityCounter >= LEGENDARY_PITY_THRESHOLD;
  const rarity = rollRarity(pityTriggered);
  const card = pickCardFromRarity(rarity, relatedCategories);
  return { card, pityTriggered };
}
