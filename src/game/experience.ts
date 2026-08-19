import type { AppState, WorkoutLog } from '../types';
import { countSessionsByWeek } from './weeklyGoal';

const XP_PER_WORKOUT = 100;
const XP_PER_OPENED_PACK = 30;
const XP_PER_PERSONAL_BEST = 50;
const XP_PER_WEEKLY_GOAL = 150;
const XP_PER_LEVEL_FACTOR = 500;

export interface ExperienceProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  requiredXp: number;
  remainingXp: number;
  progressPercent: number;
  workoutXp: number;
  openedPackXp: number;
  personalBestXp: number;
  weeklyGoalXp: number;
}

function countCompletedGoalWeeks(logs: WorkoutLog[], targetSessionsPerWeek: number): number {
  if (targetSessionsPerWeek <= 0) return 0;
  return [...countSessionsByWeek(logs).values()]
    .filter((sessions) => sessions >= targetSessionsPerWeek)
    .length;
}

function getLevelStartXp(level: number): number {
  const completedLevels = Math.max(0, level - 1);
  return XP_PER_LEVEL_FACTOR * ((completedLevels * (completedLevels + 1)) / 2);
}

export function calculateLevelFromXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= getLevelStartXp(level + 1)) level += 1;
  return level;
}

export function calculateExperienceProgress(state: AppState): ExperienceProgress {
  const workoutXp = state.workoutLogs.length * XP_PER_WORKOUT;
  const openedPackXp = state.grantedPacks.filter((pack) => Boolean(pack.openedAt)).length * XP_PER_OPENED_PACK;
  const personalBestXp = state.workoutLogs.filter((log) => (
    log.personalBestExerciseIds === undefined
      ? log.feeling === 'personal-best'
      : log.personalBestExerciseIds.length > 0
  )).length * XP_PER_PERSONAL_BEST;
  const completedGoalWeeks = countCompletedGoalWeeks(
    state.workoutLogs,
    state.user.weeklyGoal.targetSessionsPerWeek,
  );
  const weeklyGoalXp = completedGoalWeeks * XP_PER_WEEKLY_GOAL;
  const totalXp = workoutXp + openedPackXp + personalBestXp + weeklyGoalXp;

  const level = calculateLevelFromXp(totalXp);
  const requiredXp = level * XP_PER_LEVEL_FACTOR;
  const earnedInLevel = Math.max(0, totalXp - getLevelStartXp(level));
  const currentLevelXp = Math.min(requiredXp, earnedInLevel);
  const remainingXp = Math.max(0, requiredXp - currentLevelXp);
  const progressPercent = requiredXp > 0
    ? Math.min(100, Math.round((currentLevelXp / requiredXp) * 100))
    : 0;

  return {
    level,
    totalXp,
    currentLevelXp,
    requiredXp,
    remainingXp,
    progressPercent,
    workoutXp,
    openedPackXp,
    personalBestXp,
    weeklyGoalXp,
  };
}
