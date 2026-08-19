import type { WorkoutLog, WorkoutSetEntry } from '../types';
import { buildExerciseAnalysis } from './exerciseAnalysis';

export type PersonalBestMetric = 'weight' | 'duration' | 'reps';

export interface PersonalBestResult {
  exerciseId: string;
  exerciseName: string;
  metric: PersonalBestMetric;
  previousValue: number;
  value: number;
}

function currentMetricValue(entry: WorkoutSetEntry): { metric: PersonalBestMetric; value: number } {
  if (entry.exerciseLogType === 'duration' || (entry.durationMinutes ?? 0) > 0) {
    return { metric: 'duration', value: Math.max(0, entry.durationMinutes ?? 0) };
  }

  if ((entry.weightKg ?? 0) > 0) {
    return { metric: 'weight', value: Math.max(0, entry.weightKg ?? 0) };
  }

  return {
    metric: 'reps',
    value: Math.max(0, entry.reps ?? 0) * Math.max(1, entry.sets ?? 1),
  };
}

export function detectWorkoutPersonalBests(
  previousLogs: WorkoutLog[],
  entries: WorkoutSetEntry[],
): PersonalBestResult[] {
  const results = new Map<string, PersonalBestResult>();

  for (const entry of entries) {
    const analysis = buildExerciseAnalysis(previousLogs, entry.exerciseId);
    if (!analysis) continue;

    const current = currentMetricValue(entry);
    const previousBest = current.metric === 'weight'
      ? analysis.personalBests.maxWeightKg
      : current.metric === 'duration'
        ? analysis.personalBests.maxDurationMinutes
        : analysis.personalBests.maxReps;

    if (previousBest === undefined || current.value <= previousBest) continue;

    const next: PersonalBestResult = {
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName ?? analysis.exerciseName,
      metric: current.metric,
      previousValue: previousBest,
      value: current.value,
    };
    const existing = results.get(entry.exerciseId);
    if (!existing || next.value > existing.value) results.set(entry.exerciseId, next);
  }

  return [...results.values()];
}

export function detectPersonalBestExerciseIds(
  previousLogs: WorkoutLog[],
  entries: WorkoutSetEntry[],
): string[] {
  return detectWorkoutPersonalBests(previousLogs, entries).map((result) => result.exerciseId);
}
