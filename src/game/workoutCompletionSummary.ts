import type { FeelingTag } from '../types';

const XP_PER_WORKOUT = 100;
const XP_PER_PERSONAL_BEST = 50;
const XP_PER_WEEKLY_GOAL = 150;

export interface WorkoutCompletionSummary {
  durationSeconds: number;
  xpGain: number;
  weeklySessions: number;
  weeklyGoalTarget: number;
  weeklyRemaining: number;
  weeklyGoalCompletedNow: boolean;
  packCount: 1;
}

export function buildWorkoutCompletionSummary({
  durationSeconds,
  feeling,
  sessionsThisWeek,
  weeklyGoalTarget,
}: {
  durationSeconds: number;
  feeling: FeelingTag;
  sessionsThisWeek: number;
  weeklyGoalTarget: number;
}): WorkoutCompletionSummary {
  const safeTarget = Math.max(1, weeklyGoalTarget);
  const currentSessions = Math.max(0, sessionsThisWeek);
  const weeklySessions = currentSessions + 1;
  const weeklyGoalCompletedNow = currentSessions < safeTarget && weeklySessions >= safeTarget;
  const personalBestBonus = feeling === 'personal-best' ? XP_PER_PERSONAL_BEST : 0;
  const weeklyGoalBonus = weeklyGoalCompletedNow ? XP_PER_WEEKLY_GOAL : 0;

  return {
    durationSeconds: Math.max(0, Math.floor(durationSeconds)),
    xpGain: XP_PER_WORKOUT + personalBestBonus + weeklyGoalBonus,
    weeklySessions,
    weeklyGoalTarget: safeTarget,
    weeklyRemaining: Math.max(0, safeTarget - weeklySessions),
    weeklyGoalCompletedNow,
    packCount: 1,
  };
}
