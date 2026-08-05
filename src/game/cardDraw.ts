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
 * 카드 획득 확률 가중에 사용 (CLAUDE.md 5절).
 */
export function categoriesFromEntries(entries: WorkoutSetEntry[]): ExerciseCategory[] {
  const set = new Set<ExerciseCategory>();
  for (const entry of entries) {
    const exercise = EXERCISES_BY_ID[entry.exerciseId];
    if (exercise) set.add(exercise.category);
  }
  return [...set];
}

/** 등급 하나를 확률에 따라 뽑는다. pityBoost가 true면 레전드 확률을 크게 올린다. */
function rollRarity(pityBoost: boolean): CardRarity {
  const rates: Record<CardRarity, number> = pityBoost
    ? {
        // 천장 보정: 레전드 확률을 대폭 상향하고 나머지 비율은 유지한 채 축소
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

/**
 * 오늘 수행한 운동과 관련된 카드가 나올 확률을 높여서 등급 안에서 카드 하나를 고른다.
 * 관련 카드가 없으면 해당 등급 전체 풀에서 고른다.
 */
function pickCardFromRarity(rarity: CardRarity, relatedCategories: ExerciseCategory[]): CardDefinition {
  const pool = CARDS_BY_RARITY[rarity];
  if (pool.length === 0) {
    // 안전장치: 해당 등급 카드가 아직 없으면 전체 카드에서 폴백
    const all = Object.values(CARDS_BY_RARITY).flat();
    return all[Math.floor(Math.random() * all.length)];
  }

  const related = pool.filter((c) => {
    const exercise = EXERCISES_BY_ID[c.exerciseId];
    return exercise && relatedCategories.includes(exercise.category);
  });

  // 관련 카드는 3배 가중치를 준다 (완전 랜덤이 아니라 오늘 운동과 연관된 카드가 더 잘 나오게)
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

/**
 * 카드팩 하나를 개봉해 카드 한 장을 뽑는다.
 * @param relatedCategories 오늘 기록한 운동의 카테고리 (가중치용)
 * @param legendaryPityCounter 레전드 미획득 연속 팩 수
 */
export function drawCard(
  relatedCategories: ExerciseCategory[],
  legendaryPityCounter: number,
): DrawResult {
  const pityTriggered = legendaryPityCounter >= LEGENDARY_PITY_THRESHOLD;
  const rarity = rollRarity(pityTriggered);
  const card = pickCardFromRarity(rarity, relatedCategories);
  return { card, pityTriggered };
}
