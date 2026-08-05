import type { CardDefinition, CardRarity, Exercise, ExerciseCategory, OwnedCard } from '../types';

export interface ComboResultItem {
  packId: string;
  cardId: string;
  rarity: CardRarity;
  isNew: boolean;
  previousStarLevel: number;
  currentStarLevel: number;
  evolved: boolean;
}

export interface ComboSummary {
  opened: number;
  newCards: number;
  duplicates: number;
  starUps: number;
  highestRarity: CardRarity | null;
}

export interface CompletedCategory {
  category: ExerciseCategory;
  label: string;
  owned: number;
  total: number;
  cards: CardDefinition[];
}

const RARITY_ORDER: Record<CardRarity, number> = {
  common: 0,
  rare: 1,
  'super-rare': 2,
  legendary: 3,
};

export function getComboPresentation(index: number): { label: string; level: number; isMax: boolean } {
  const count = Math.max(1, index + 1);
  if (count >= 4) return { label: 'MAX COMBO', level: 4, isMax: true };
  if (count === 3) return { label: 'COMBO x3', level: 3, isMax: false };
  if (count === 2) return { label: 'COMBO x2', level: 2, isMax: false };
  return { label: 'COMBO START', level: 1, isMax: false };
}

export function summarizeComboResults(results: ComboResultItem[]): ComboSummary {
  return results.reduce<ComboSummary>((summary, item) => {
    summary.opened += 1;
    summary.newCards += item.isNew ? 1 : 0;
    summary.duplicates += item.isNew ? 0 : 1;
    summary.starUps += item.currentStarLevel > item.previousStarLevel ? 1 : 0;
    if (!summary.highestRarity || RARITY_ORDER[item.rarity] > RARITY_ORDER[summary.highestRarity]) {
      summary.highestRarity = item.rarity;
    }
    return summary;
  }, { opened: 0, newCards: 0, duplicates: 0, starUps: 0, highestRarity: null });
}

export function getCompletedCategoryForCard(
  card: CardDefinition,
  cards: CardDefinition[],
  exercises: Exercise[],
  ownedCards: Record<string, OwnedCard>,
  wasNew: boolean,
  categoryLabels: Record<ExerciseCategory, string>,
): CompletedCategory | null {
  if (!wasNew) return null;
  const exercise = exercises.find((item) => item.id === card.exerciseId);
  if (!exercise) return null;
  const categoryCards = cards.filter((candidate) => {
    const candidateExercise = exercises.find((item) => item.id === candidate.exerciseId);
    return candidateExercise?.category === exercise.category;
  });
  if (categoryCards.length === 0) return null;
  const ownedAfter = categoryCards.filter((candidate) => Boolean(ownedCards[candidate.id])).length;
  const ownedBefore = ownedAfter - 1;
  if (ownedBefore >= categoryCards.length || ownedAfter !== categoryCards.length) return null;
  return {
    category: exercise.category,
    label: categoryLabels[exercise.category],
    owned: ownedAfter,
    total: categoryCards.length,
    cards: categoryCards,
  };
}
