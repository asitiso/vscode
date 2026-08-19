import { describe, expect, it } from 'vitest';
import { buildWorkoutCompletionSummary } from './workoutCompletionSummary';

describe('buildWorkoutCompletionSummary', () => {
  it('awards the base workout XP and advances weekly progress on a new active day', () => {
    expect(buildWorkoutCompletionSummary({
      durationSeconds: 1938,
      feeling: 'moderate',
      sessionsThisWeek: 0,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    })).toEqual({
      durationSeconds: 1938,
      xpGain: 100,
      weeklySessions: 1,
      weeklyGoalTarget: 3,
      weeklyRemaining: 2,
      weeklyGoalCompletedNow: false,
      packCount: 1,
    });
  });

  it('adds the personal-best XP bonus', () => {
    const summary = buildWorkoutCompletionSummary({
      durationSeconds: 900,
      feeling: 'personal-best',
      sessionsThisWeek: 1,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });

    expect(summary.xpGain).toBe(150);
    expect(summary.weeklySessions).toBe(2);
  });

  it('adds the weekly-goal XP bonus only when this workout completes the goal', () => {
    const completed = buildWorkoutCompletionSummary({
      durationSeconds: 1200,
      feeling: 'hard',
      sessionsThisWeek: 2,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });
    const alreadyComplete = buildWorkoutCompletionSummary({
      durationSeconds: 1200,
      feeling: 'hard',
      sessionsThisWeek: 3,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: true,
    });

    expect(completed.xpGain).toBe(250);
    expect(completed.weeklyGoalCompletedNow).toBe(true);
    expect(completed.weeklyRemaining).toBe(0);
    expect(alreadyComplete.xpGain).toBe(100);
    expect(alreadyComplete.weeklyGoalCompletedNow).toBe(false);
  });

  it('does not advance weekly progress or award weekly bonus for another workout on the same day', () => {
    const summary = buildWorkoutCompletionSummary({
      durationSeconds: 600,
      feeling: 'moderate',
      sessionsThisWeek: 2,
      weeklyGoalTarget: 3,
      countsTowardWeeklyGoal: false,
    });

    expect(summary.weeklySessions).toBe(2);
    expect(summary.weeklyRemaining).toBe(1);
    expect(summary.weeklyGoalCompletedNow).toBe(false);
    expect(summary.xpGain).toBe(100);
  });
});
