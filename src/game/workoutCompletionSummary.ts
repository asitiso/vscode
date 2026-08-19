import type { FeelingTag } from '../types';
import type { PersonalBestResult } from './personalBest';

const XP_PER_WORKOUT = 100;
const XP_PER_PERSONAL_BEST = 50;
const XP_PER_WEEKLY_GOAL = 150;

export interface WorkoutCompletionSummary {
  durationSeconds: number;
  xpGain: number;
  personalBests: PersonalBestResult[];
  personalBestBonusXp: 0 | 50;
  weeklySessions: number;
  weeklyGoalTarget: number;
  weeklyRemaining: number;
  weeklyGoalCompletedNow: boolean;
  packCount: number;
  weeklyRewardPackCount: 0 | 1;
}

export function buildWorkoutCompletionSummary({
  durationSeconds,
  personalBests,
  sessionsThisWeek,
  weeklyGoalTarget,
  countsTowardWeeklyGoal,
}: {
  durationSeconds: number;
  feeling: FeelingTag;
  personalBests: PersonalBestResult[];
  sessionsThisWeek: number;
  weeklyGoalTarget: number;
  countsTowardWeeklyGoal: boolean;
}): WorkoutCompletionSummary {
  const safeTarget = Math.max(1, weeklyGoalTarget);
  const currentSessions = Math.max(0, sessionsThisWeek);
  const weeklySessions = currentSessions + (countsTowardWeeklyGoal ? 1 : 0);
  const weeklyGoalCompletedNow = countsTowardWeeklyGoal
    && currentSessions < safeTarget
    && weeklySessions >= safeTarget;
  const personalBestBonusXp: 0 | 50 = personalBests.length > 0 ? XP_PER_PERSONAL_BEST : 0;
  const weeklyGoalBonus = weeklyGoalCompletedNow ? XP_PER_WEEKLY_GOAL : 0;
  const weeklyRewardPackCount: 0 | 1 = weeklyGoalCompletedNow ? 1 : 0;

  return {
    durationSeconds: Math.max(0, Math.floor(durationSeconds)),
    xpGain: XP_PER_WORKOUT + personalBestBonusXp + weeklyGoalBonus,
    personalBests,
    personalBestBonusXp,
    weeklySessions,
    weeklyGoalTarget: safeTarget,
    weeklyRemaining: Math.max(0, safeTarget - weeklySessions),
    weeklyGoalCompletedNow,
    packCount: 1 + weeklyRewardPackCount,
    weeklyRewardPackCount,
  };
}
