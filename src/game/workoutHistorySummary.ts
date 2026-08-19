import { EXERCISES_BY_ID } from '../data/exercises';
import type { WorkoutLog } from '../types';
import { shiftDateKey } from './workoutReport';

export interface RollingWorkoutSummary {
  totalSeconds: number;
  activeDays: number;
  logCount: number;
}

export interface WorkoutLogHistoryItem {
  id: string;
  date: string;
  durationSeconds: number;
  exerciseNames: string[];
  totalSets: number;
  totalReps: number;
  packCount: number;
}

export function getWorkoutSessionSeconds(log: WorkoutLog): number {
  if (typeof log.durationSeconds === 'number' && Number.isFinite(log.durationSeconds) && log.durationSeconds > 0) {
    return Math.floor(log.durationSeconds);
  }

  const fallbackMinutes = log.entries.reduce((sum, entry) => sum + Math.max(0, entry.durationMinutes ?? 0), 0);
  return Math.floor(fallbackMinutes * 60);
}

export function buildRollingWorkoutSummary(
  workoutLogs: WorkoutLog[],
  endDate: string,
  days: number,
): RollingWorkoutSummary {
  const safeDays = Math.max(1, Math.floor(days));
  const startDate = shiftDateKey(endDate, -(safeDays - 1));
  const logs = workoutLogs.filter((log) => log.date >= startDate && log.date <= endDate);

  return {
    totalSeconds: logs.reduce((sum, log) => sum + getWorkoutSessionSeconds(log), 0),
    activeDays: new Set(logs.map((log) => log.date)).size,
    logCount: logs.length,
  };
}

export function buildWorkoutLogHistoryItem(log: WorkoutLog): WorkoutLogHistoryItem {
  const exerciseNames = Array.from(new Set(log.entries.map((entry) => (
    entry.exerciseName ?? EXERCISES_BY_ID[entry.exerciseId]?.name ?? '삭제된 운동'
  ))));

  return {
    id: log.id,
    date: log.date,
    durationSeconds: getWorkoutSessionSeconds(log),
    exerciseNames,
    totalSets: log.entries.reduce((sum, entry) => sum + Math.max(0, entry.sets ?? 0), 0),
    totalReps: log.entries.reduce((sum, entry) => sum + Math.max(0, entry.reps ?? 0) * Math.max(1, entry.sets ?? 1), 0),
    packCount: log.grantedPackIds.length,
  };
}
