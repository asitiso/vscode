import { EXERCISE_CATEGORY_LABELS, EXERCISES_BY_ID } from '../data/exercises';
import type { ExerciseCategory, WorkoutLog } from '../types';

export interface ReportMetricTotals {
  activeDays: number;
  logCount: number;
  exerciseCount: number;
  durationMinutes: number;
  sets: number;
  reps: number;
}

export interface ExerciseReportItem {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  activeDays: number;
  durationMinutes: number;
  sets: number;
  reps: number;
}

export interface CategoryReportItem {
  category: ExerciseCategory;
  label: string;
  activeEntries: number;
  percentage: number;
}

export interface DailyWorkoutReport {
  date: string;
  logs: WorkoutLog[];
  exercises: ExerciseReportItem[];
  totals: ReportMetricTotals;
  categories: CategoryReportItem[];
}

export interface PeriodWorkoutReport {
  startDate: string;
  endDate: string;
  days: DailyWorkoutReport[];
  totals: ReportMetricTotals;
  topExercises: ExerciseReportItem[];
  categories: CategoryReportItem[];
}

const EMPTY_TOTALS: ReportMetricTotals = {
  activeDays: 0,
  logCount: 0,
  exerciseCount: 0,
  durationMinutes: 0,
  sets: 0,
  reps: 0,
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return toDateKey(date);
}

export function getWeekEnd(weekStart: string): string {
  return shiftDateKey(weekStart, 6);
}

function getExerciseMeta(entry: WorkoutLog['entries'][number]): {
  name: string;
  category: ExerciseCategory;
} {
  const exercise = EXERCISES_BY_ID[entry.exerciseId];
  return {
    name: entry.exerciseName ?? exercise?.name ?? '삭제된 운동',
    category: exercise?.category ?? 'etc',
  };
}

function buildCategories(logs: WorkoutLog[]): CategoryReportItem[] {
  const counts = new Map<ExerciseCategory, number>();
  let totalEntries = 0;

  for (const log of logs) {
    for (const entry of log.entries) {
      const { category } = getExerciseMeta(entry);
      counts.set(category, (counts.get(category) ?? 0) + 1);
      totalEntries += 1;
    }
  }

  return [...counts.entries()]
    .map(([category, activeEntries]) => ({
      category,
      label: EXERCISE_CATEGORY_LABELS[category],
      activeEntries,
      percentage: totalEntries > 0 ? Math.round((activeEntries / totalEntries) * 100) : 0,
    }))
    .sort((a, b) => b.activeEntries - a.activeEntries || a.label.localeCompare(b.label, 'ko'));
}

export function buildDailyReport(workoutLogs: WorkoutLog[], dateKey: string): DailyWorkoutReport {
  const logs = workoutLogs.filter((log) => log.date === dateKey);
  const exerciseMap = new Map<string, ExerciseReportItem>();

  for (const log of logs) {
    for (const entry of log.entries) {
      const { name, category } = getExerciseMeta(entry);
      const current = exerciseMap.get(entry.exerciseId) ?? {
        exerciseId: entry.exerciseId,
        name,
        category,
        activeDays: 1,
        durationMinutes: 0,
        sets: 0,
        reps: 0,
      };
      current.name = name;
      current.durationMinutes += entry.durationMinutes ?? 0;
      current.sets += entry.sets ?? 0;
      current.reps += (entry.reps ?? 0) * Math.max(1, entry.sets ?? 1);
      exerciseMap.set(entry.exerciseId, current);
    }
  }

  const exercises = [...exerciseMap.values()].sort((a, b) =>
    (b.sets + b.durationMinutes) - (a.sets + a.durationMinutes) || a.name.localeCompare(b.name, 'ko'),
  );

  return {
    date: dateKey,
    logs,
    exercises,
    totals: {
      activeDays: logs.length > 0 ? 1 : 0,
      logCount: logs.length,
      exerciseCount: exercises.length,
      durationMinutes: exercises.reduce((sum, item) => sum + item.durationMinutes, 0),
      sets: exercises.reduce((sum, item) => sum + item.sets, 0),
      reps: exercises.reduce((sum, item) => sum + item.reps, 0),
    },
    categories: buildCategories(logs),
  };
}

function buildPeriodReport(workoutLogs: WorkoutLog[], startDate: string, endDate: string): PeriodWorkoutReport {
  const days: DailyWorkoutReport[] = [];
  for (let date = startDate; date <= endDate; date = shiftDateKey(date, 1)) {
    days.push(buildDailyReport(workoutLogs, date));
  }

  const periodLogs = workoutLogs.filter((log) => log.date >= startDate && log.date <= endDate);
  const exerciseMap = new Map<string, ExerciseReportItem>();
  const activeDatesByExercise = new Map<string, Set<string>>();

  for (const log of periodLogs) {
    for (const entry of log.entries) {
      const { name, category } = getExerciseMeta(entry);
      const current = exerciseMap.get(entry.exerciseId) ?? {
        exerciseId: entry.exerciseId,
        name,
        category,
        activeDays: 0,
        durationMinutes: 0,
        sets: 0,
        reps: 0,
      };
      current.name = name;
      current.durationMinutes += entry.durationMinutes ?? 0;
      current.sets += entry.sets ?? 0;
      current.reps += (entry.reps ?? 0) * Math.max(1, entry.sets ?? 1);
      exerciseMap.set(entry.exerciseId, current);

      const dates = activeDatesByExercise.get(entry.exerciseId) ?? new Set<string>();
      dates.add(log.date);
      activeDatesByExercise.set(entry.exerciseId, dates);
    }
  }

  const topExercises = [...exerciseMap.values()]
    .map((item) => ({ ...item, activeDays: activeDatesByExercise.get(item.exerciseId)?.size ?? 0 }))
    .sort((a, b) =>
      b.activeDays - a.activeDays ||
      (b.sets + b.durationMinutes) - (a.sets + a.durationMinutes) ||
      a.name.localeCompare(b.name, 'ko'),
    );

  const totals: ReportMetricTotals = periodLogs.length === 0
    ? { ...EMPTY_TOTALS }
    : {
        activeDays: new Set(periodLogs.map((log) => log.date)).size,
        logCount: periodLogs.length,
        exerciseCount: exerciseMap.size,
        durationMinutes: topExercises.reduce((sum, item) => sum + item.durationMinutes, 0),
        sets: topExercises.reduce((sum, item) => sum + item.sets, 0),
        reps: topExercises.reduce((sum, item) => sum + item.reps, 0),
      };

  return {
    startDate,
    endDate,
    days,
    totals,
    topExercises,
    categories: buildCategories(periodLogs),
  };
}

export function buildWeeklyReport(workoutLogs: WorkoutLog[], weekStart: string): PeriodWorkoutReport {
  return buildPeriodReport(workoutLogs, weekStart, getWeekEnd(weekStart));
}

export function buildMonthlyReport(workoutLogs: WorkoutLog[], year: number, month: number): PeriodWorkoutReport {
  const startDate = toDateKey(new Date(year, month - 1, 1));
  const endDate = toDateKey(new Date(year, month, 0));
  return buildPeriodReport(workoutLogs, startDate, endDate);
}

export function getPreviousPeriodDelta(
  current: PeriodWorkoutReport,
  previous: PeriodWorkoutReport,
): ReportMetricTotals {
  return {
    activeDays: current.totals.activeDays - previous.totals.activeDays,
    logCount: current.totals.logCount - previous.totals.logCount,
    exerciseCount: current.totals.exerciseCount - previous.totals.exerciseCount,
    durationMinutes: current.totals.durationMinutes - previous.totals.durationMinutes,
    sets: current.totals.sets - previous.totals.sets,
    reps: current.totals.reps - previous.totals.reps,
  };
}
