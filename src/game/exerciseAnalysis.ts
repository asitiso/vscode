import { EXERCISES_BY_ID } from '../data/exercises';
import type { ExerciseCategory, FeelingTag, WorkoutLog } from '../types';

export type ExerciseTrendMetric = 'weight' | 'duration' | 'reps';

export interface ExercisePerformanceRecord {
  id: string;
  logId: string;
  date: string;
  createdAt: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  weightKg: number;
  durationMinutes: number;
  sets: number;
  repsPerSet: number;
  totalReps: number;
  feeling: FeelingTag;
  isPersonalBest: boolean;
  note?: string;
}

export interface ExerciseAnalysisTotals {
  activeDays: number;
  recordCount: number;
  sets: number;
  reps: number;
  durationMinutes: number;
}

export interface ExercisePersonalBest {
  maxWeightKg?: number;
  maxDurationMinutes?: number;
  maxReps?: number;
}

export interface ExerciseTrendPoint {
  recordId: string;
  date: string;
  value: number;
}

export interface ExerciseAnalysis {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  latestDate: string;
  totals: ExerciseAnalysisTotals;
  personalBests: ExercisePersonalBest;
  history: ExercisePerformanceRecord[];
  recentRecords: ExercisePerformanceRecord[];
  trend: { metric: ExerciseTrendMetric; points: ExerciseTrendPoint[] };
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function compareRecords(a: ExercisePerformanceRecord, b: ExercisePerformanceRecord): number {
  const aValid = isValidDateKey(a.date);
  const bValid = isValidDateKey(b.date);
  if (aValid !== bValid) return aValid ? -1 : 1;
  if (aValid && a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
  return b.id.localeCompare(a.id);
}

export function buildExerciseHistory(workoutLogs: WorkoutLog[], exerciseId: string): ExercisePerformanceRecord[] {
  const definition = EXERCISES_BY_ID[exerciseId];
  return workoutLogs
    .flatMap((log) => log.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.exerciseId === exerciseId)
      .map(({ entry, index }) => ({
        id: `${log.id}:${index}`,
        logId: log.id,
        date: log.date,
        createdAt: log.createdAt,
        exerciseId,
        exerciseName: entry.exerciseName ?? definition?.name ?? '삭제된 운동',
        category: definition?.category ?? 'etc',
        weightKg: entry.weightKg ?? 0,
        durationMinutes: entry.durationMinutes ?? 0,
        sets: entry.sets ?? 0,
        repsPerSet: entry.reps ?? 0,
        totalReps: (entry.reps ?? 0) * Math.max(1, entry.sets ?? 1),
        feeling: log.feeling,
        isPersonalBest: log.personalBestExerciseIds === undefined
          ? log.feeling === 'personal-best'
          : log.personalBestExerciseIds.includes(exerciseId),
        note: log.memo,
      })))
    .sort(compareRecords);
}

export function buildExerciseTrend(records: ExercisePerformanceRecord[]): { metric: ExerciseTrendMetric; points: ExerciseTrendPoint[] } {
  const metric: ExerciseTrendMetric = records.some((record) => record.weightKg > 0)
    ? 'weight'
    : records.some((record) => record.durationMinutes > 0)
      ? 'duration'
      : 'reps';

  const points = records.slice(0, 4).reverse().map((record) => ({
    recordId: record.id,
    date: record.date,
    value: metric === 'weight' ? record.weightKg : metric === 'duration' ? record.durationMinutes : record.totalReps,
  }));

  return { metric, points };
}

export function buildExerciseAnalysis(workoutLogs: WorkoutLog[], exerciseId: string): ExerciseAnalysis | null {
  const history = buildExerciseHistory(workoutLogs, exerciseId);
  if (history.length === 0) return null;

  const positiveWeights = history.map((record) => record.weightKg).filter((value) => value > 0);
  const positiveDurations = history.map((record) => record.durationMinutes).filter((value) => value > 0);
  const positiveReps = history.map((record) => record.totalReps).filter((value) => value > 0);

  return {
    exerciseId,
    exerciseName: history[0].exerciseName,
    category: history[0].category,
    latestDate: history[0].date,
    totals: {
      activeDays: new Set(history.map((record) => record.date)).size,
      recordCount: history.length,
      sets: history.reduce((sum, record) => sum + record.sets, 0),
      reps: history.reduce((sum, record) => sum + record.totalReps, 0),
      durationMinutes: history.reduce((sum, record) => sum + record.durationMinutes, 0),
    },
    personalBests: {
      maxWeightKg: positiveWeights.length ? Math.max(...positiveWeights) : undefined,
      maxDurationMinutes: positiveDurations.length ? Math.max(...positiveDurations) : undefined,
      maxReps: positiveReps.length ? Math.max(...positiveReps) : undefined,
    },
    history,
    recentRecords: history.slice(0, 4),
    trend: buildExerciseTrend(history),
  };
}
