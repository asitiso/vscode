import type { WorkoutLog, WorkoutSetEntry } from '../types';
import { buildExerciseAnalysis } from './exerciseAnalysis';

function currentMetricValue(entry: WorkoutSetEntry): { metric: 'weight' | 'duration' | 'reps'; value: number } {
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

export function detectPersonalBestExerciseIds(
  previousLogs: WorkoutLog[],
  entries: WorkoutSetEntry[],
): string[] {
  const personalBestIds = new Set<string>();

  for (const entry of entries) {
    const analysis = buildExerciseAnalysis(previousLogs, entry.exerciseId);
    if (!analysis) continue;

    const current = currentMetricValue(entry);
    const previousBest = current.metric === 'weight'
      ? analysis.personalBests.maxWeightKg
      : current.metric === 'duration'
        ? analysis.personalBests.maxDurationMinutes
        : analysis.personalBests.maxReps;

    if (previousBest !== undefined && current.value > previousBest) {
      personalBestIds.add(entry.exerciseId);
    }
  }

  return [...personalBestIds];
}
