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

export interface PersonalBestPreview {
  metric: PersonalBestMetric;
  currentValue: number;
  previousValue?: number;
  isNewRecord: boolean;
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

export function buildPersonalBestPreview(
  previousLogs: WorkoutLog[],
  entry: WorkoutSetEntry,
): PersonalBestPreview {
  const current = currentMetricValue(entry);
  const analysis = buildExerciseAnalysis(previousLogs, entry.exerciseId);
  const previousValue = analysis
    ? current.metric === 'weight'
      ? analysis.personalBests.maxWeightKg
      : current.metric === 'duration'
        ? analysis.personalBests.maxDurationMinutes
        : analysis.personalBests.maxReps
    : undefined;

  return {
    metric: current.metric,
    currentValue: current.value,
    previousValue,
    isNewRecord: previousValue !== undefined && current.value > previousValue,
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

    const preview = buildPersonalBestPreview(previousLogs, entry);
    if (preview.previousValue === undefined || !preview.isNewRecord) continue;

    const next: PersonalBestResult = {
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName ?? analysis.exerciseName,
      metric: preview.metric,
      previousValue: preview.previousValue,
      value: preview.currentValue,
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
