import { describe, expect, it } from 'vitest';
import { buildWorkoutCompletionSummary } from './workoutCompletionSummary';

const detectedBest = {
  exerciseId: 'leg-press',
  exerciseName: '레그 프레스',
  metric: 'weight' as const,
  previousValue: 60,
  value: 65,
};

describe('buildWorkoutCompletionSummary', () => {
  it('awards the base workout XP and advances weekly progress on a new active day', () => {
    expect(buildWorkoutCompletionSummary({
      durationSeconds: 1938,
      feeling: 'moderate',
      personalBests: [],
      sessionsThisWeek: 0,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    })).toEqual({
      durationSeconds: 1938,
      xpGain: 100,
      personalBests: [],
      weeklySessions: 1,
      weeklyGoalTarget: 3,
      weeklyRemaining: 2,
      weeklyGoalCompletedNow: false,
      packCount: 1,
      weeklyRewardPackCount: 0,
    });
  });

  it('carries detected personal best details into the completion summary', () => {
    const summary = buildWorkoutCompletionSummary({
      durationSeconds: 900,
      feeling: 'moderate',
      personalBests: [detectedBest],
      sessionsThisWeek: 1,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });

    expect(summary.personalBests).toEqual([detectedBest]);
  });

  it('adds the legacy personal-best feeling XP bonus', () => {
    const summary = buildWorkoutCompletionSummary({
      durationSeconds: 900,
      feeling: 'personal-best',
      personalBests: [],
      sessionsThisWeek: 1,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });

    expect(summary.xpGain).toBe(150);
    expect(summary.weeklySessions).toBe(2);
    expect(summary.packCount).toBe(1);
  });

  it('adds the weekly-goal XP bonus and weekly reward pack only when this workout completes the goal', () => {
    const completed = buildWorkoutCompletionSummary({
      durationSeconds: 1200,
      feeling: 'hard',
      personalBests: [],
      sessionsThisWeek: 2,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });
    const alreadyComplete = buildWorkoutCompletionSummary({
      durationSeconds: 1200,
      feeling: 'hard',
      personalBests: [],
      sessionsThisWeek: 3,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });

    expect(completed.xpGain).toBe(250);
    expect(completed.weeklyGoalCompletedNow).toBe(true);
    expect(completed.weeklyRemaining).toBe(0);
    expect(completed.packCount).toBe(2);
    expect(completed.weeklyRewardPackCount).toBe(1);
    expect(alreadyComplete.xpGain).toBe(100);
    expect(alreadyComplete.weeklyGoalCompletedNow).toBe(false);
    expect(alreadyComplete.packCount).toBe(1);
    expect(alreadyComplete.weeklyRewardPackCount).toBe(0);
  });

  it('does not advance weekly progress or award weekly bonus for another workout on the same day', () => {
    const summary = buildWorkoutCompletionSummary({
      durationSeconds: 600,
      feeling: 'moderate',
      personalBests: [],
      sessionsThisWeek: 2,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: false,
    });

    expect(summary.weeklySessions).toBe(2);
    expect(summary.weeklyRemaining).toBe(1);
    expect(summary.weeklyGoalCompletedNow).toBe(false);
    expect(summary.xpGain).toBe(100);
    expect(summary.packCount).toBe(1);
    expect(summary.weeklyRewardPackCount).toBe(0);
  });
});
