import { CARDS_BY_ID } from '../data/cards';
import { EXERCISES_BY_ID, EXERCISE_CATEGORY_LABELS } from '../data/exercises';
import type {
  DailyMissionDefinition,
  ExerciseCategory,
  WorkoutLog,
} from '../types';
import { CARD_SETS_BY_ID } from './cardSets';

const FALLBACK_CATEGORIES: ExerciseCategory[] = [
  'cardio',
  'legs',
  'back',
  'chest',
  'shoulders',
  'stretching',
  'etc',
];

function dateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function categoryForExercise(exerciseId: string): ExerciseCategory {
  return EXERCISES_BY_ID[exerciseId]?.category ?? 'etc';
}

function missionBase(
  date: string,
  difficulty: DailyMissionDefinition['difficulty'],
): Pick<DailyMissionDefinition, 'id' | 'date' | 'difficulty' | 'rewardPackDefId'> {
  return {
    id: `${date}-${difficulty}`,
    date,
    difficulty,
    rewardPackDefId: 'pack-daily-mission',
  };
}

function categoryMission(
  date: string,
  difficulty: 'easy' | 'normal',
  category: ExerciseCategory,
  targetCount: 1 | 2,
): DailyMissionDefinition {
  const label = EXERCISE_CATEGORY_LABELS[category];
  return {
    ...missionBase(date, difficulty),
    id: `${date}-${difficulty}-${category}`,
    kind: targetCount === 1 ? 'category-one' : 'category-two',
    title: `${label} 운동 ${targetCount}종 기록`,
    description: targetCount === 1
      ? `${label} 운동을 1종 기록하세요.`
      : `서로 다른 ${label} 운동을 2종 기록하세요.`,
    targetCount,
    category,
  };
}

function anyTwoMission(date: string): DailyMissionDefinition {
  return {
    ...missionBase(date, 'normal'),
    id: `${date}-normal-any-two`,
    kind: 'any-two',
    title: '서로 다른 운동 2종 기록',
    description: '카테고리에 관계없이 서로 다른 운동을 2종 기록하세요.',
    targetCount: 2,
  };
}

function focusSetMission(date: string, focusSetId: string): DailyMissionDefinition {
  const set = CARD_SETS_BY_ID[focusSetId];
  const name = set?.name ?? '오늘의 집중 세트';
  return {
    ...missionBase(date, 'hard'),
    id: `${date}-hard-${focusSetId}`,
    kind: 'focus-set-two',
    title: `${name} 운동 2종 기록`,
    description: `${name}에 연결된 서로 다른 운동을 2종 기록하세요.`,
    targetCount: 2,
    focusSetId,
  };
}

export function generateDailyMissions(
  date: string,
  workoutLogs: WorkoutLog[],
  focusSetId: string,
): DailyMissionDefinition[] {
  const start = toDateKey(addDays(dateKeyToLocalDate(date), -13));
  const recentLogs = workoutLogs.filter((log) => log.date >= start && log.date <= date);

  if (recentLogs.length < 2) {
    return [
      categoryMission(date, 'easy', 'cardio', 1),
      anyTwoMission(date),
      focusSetMission(date, focusSetId),
    ];
  }

  const frequency = new Map<ExerciseCategory, number>();
  for (const log of recentLogs) {
    const categories = new Set(log.entries.map((entry) => categoryForExercise(entry.exerciseId)));
    for (const category of categories) {
      frequency.set(category, (frequency.get(category) ?? 0) + 1);
    }
  }

  const ranked = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || FALLBACK_CATEGORIES.indexOf(a[0]) - FALLBACK_CATEGORIES.indexOf(b[0]))
    .map(([category]) => category);

  const easyCategory = ranked[0] ?? 'cardio';
  const normalCategory = ranked.find((category) => category !== easyCategory)
    ?? FALLBACK_CATEGORIES.find((category) => category !== easyCategory)
    ?? 'legs';

  return [
    categoryMission(date, 'easy', easyCategory, 1),
    categoryMission(date, 'normal', normalCategory, 2),
    focusSetMission(date, focusSetId),
  ];
}

function focusSetExerciseIds(focusSetId?: string): Set<string> {
  if (!focusSetId) return new Set();
  const set = CARD_SETS_BY_ID[focusSetId];
  if (!set) return new Set();
  return new Set(
    set.cardIds
      .map((cardId) => CARDS_BY_ID[cardId]?.exerciseId)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  );
}

export function evaluateDailyMission(
  mission: DailyMissionDefinition,
  date: string,
  workoutLogs: WorkoutLog[],
): { current: number; target: number; completed: boolean } {
  const exerciseIds = new Set<string>();
  const focusExerciseIds = focusSetExerciseIds(mission.focusSetId);

  for (const log of workoutLogs) {
    if (log.date !== date) continue;
    for (const entry of log.entries) {
      const category = categoryForExercise(entry.exerciseId);
      const qualifies =
        mission.kind === 'any-two'
        || (mission.kind === 'focus-set-two' && focusExerciseIds.has(entry.exerciseId))
        || ((mission.kind === 'category-one' || mission.kind === 'category-two') && category === mission.category);
      if (qualifies) exerciseIds.add(entry.exerciseId);
    }
  }

  const current = Math.min(exerciseIds.size, mission.targetCount);
  return {
    current,
    target: mission.targetCount,
    completed: current >= mission.targetCount,
  };
}
