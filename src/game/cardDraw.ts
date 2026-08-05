import { CARDS_BY_RARITY } from '../data/cards';
import { EXERCISES_BY_ID } from '../data/exercises';
import {
  DAILY_MISSION_DROP_RATE,
  LEGENDARY_PITY_THRESHOLD,
  RARITY_DROP_RATE,
  SET_COMPLETION_DROP_RATE,
  type CardDefinition,
  type CardRarity,
  type ExerciseCategory,
  type WorkoutSetEntry,
} from '../types';
import { CARD_SETS_BY_ID } from './cardSets';

export function categoriesFromEntries(entries: WorkoutSetEntry[]): ExerciseCategory[] {
  const set = new Set<ExerciseCategory>();
  for (const entry of entries) {
    const exercise = EXERCISES_BY_ID[entry.exerciseId];
    set.add(exercise?.category ?? 'etc');
  }
  return [...set];
}

export interface DrawOptions {
  dailySetId?: string;
  completionSetId?: string;
  missionPack?: boolean;
}

function rollFromRates(rates: Record<CardRarity, number>): CardRarity {
  const total = Object.values(rates).reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (const rarity of ['legendary', 'super-rare', 'rare', 'common'] as CardRarity[]) {
    roll -= rates[rarity];
    if (roll <= 0) return rarity;
  }
  return 'common';
}

function rollRarity(pityBoost: boolean, completionPack: boolean, missionPack: boolean): CardRarity {
  if (completionPack) {
    return rollFromRates({ common: 0, ...SET_COMPLETION_DROP_RATE });
  }
  if (missionPack) return rollFromRates(DAILY_MISSION_DROP_RATE);

  const rates: Record<CardRarity, number> = pityBoost
    ? {
        legendary: 0.2,
        'super-rare': RARITY_DROP_RATE['super-rare'] * 0.9,
        rare: RARITY_DROP_RATE.rare * 0.9,
        common: RARITY_DROP_RATE.common * 0.9,
      }
    : RARITY_DROP_RATE;
  return rollFromRates(rates);
}

function pickCardFromRarity(
  rarity: CardRarity,
  relatedCategories: ExerciseCategory[],
  options: DrawOptions,
): CardDefinition {
  const pool = CARDS_BY_RARITY[rarity];
  const fallbackPool = pool.length > 0 ? pool : Object.values(CARDS_BY_RARITY).flat();
  const dailySet = options.dailySetId ? CARD_SETS_BY_ID[options.dailySetId] : undefined;
  const completionSet = options.completionSetId ? CARD_SETS_BY_ID[options.completionSetId] : undefined;
  const weighted: CardDefinition[] = [];

  for (const card of fallbackPool) {
    const exercise = EXERCISES_BY_ID[card.exerciseId];
    const related = Boolean(exercise && relatedCategories.includes(exercise.category));
    const daily = Boolean(dailySet?.cardIds.includes(card.id));
    const completion = Boolean(completionSet?.cardIds.includes(card.id));
    const weight = completion ? 6 : daily ? 5 : related ? 3 : 1;
    for (let i = 0; i < weight; i += 1) weighted.push(card);
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
  options: DrawOptions = {},
): DrawResult {
  const pityTriggered = legendaryPityCounter >= LEGENDARY_PITY_THRESHOLD;
  const rarity = rollRarity(
    pityTriggered,
    Boolean(options.completionSetId),
    Boolean(options.missionPack),
  );
  return {
    card: pickCardFromRarity(rarity, relatedCategories, options),
    pityTriggered,
  };
}
