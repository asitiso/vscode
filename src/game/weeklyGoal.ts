import type { WorkoutLog } from '../types';

const DAY_MS = 86_400_000;

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** 월요일 시작 ISO 주차 키 (예: "2026-W32"). */
export function getWeekKey(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
}

/** 로그를 주차별 "운동한 날짜 수"로 집계한다 (하루 여러 번 기록해도 1일로 계산). */
export function countSessionsByWeek(logs: WorkoutLog[]): Map<string, number> {
  const daysByWeek = new Map<string, Set<string>>();
  for (const log of logs) {
    const week = getWeekKey(log.date);
    if (!daysByWeek.has(week)) daysByWeek.set(week, new Set());
    daysByWeek.get(week)!.add(log.date);
  }

  const result = new Map<string, number>();
  for (const [week, days] of daysByWeek) result.set(week, days.size);
  return result;
}

/**
 * 이번 주 진행 상황과 연속 달성 주차를 계산한다.
 * 이번 주가 목표를 달성했다면 streak에 즉시 포함한다.
 * 아직 진행 중이면 지난 주부터 계산해, 진행 중인 이번 주 때문에 streak가 끊기지 않게 한다.
 */
export function computeWeeklyProgress(
  logs: WorkoutLog[],
  targetSessionsPerWeek: number,
  today = new Date(),
): { sessionsThisWeek: number; remainingThisWeek: number; streak: number } {
  const safeTarget = Math.max(1, Math.floor(targetSessionsPerWeek));
  const sessionsByWeek = countSessionsByWeek(logs);
  const todayKey = localDateKey(today);
  const currentWeek = getWeekKey(todayKey);
  const sessionsThisWeek = sessionsByWeek.get(currentWeek) ?? 0;

  let streak = 0;
  let cursorKey = sessionsThisWeek >= safeTarget ? todayKey : shiftLocalDateKey(todayKey, -7);

  for (let i = 0; i < 104; i += 1) {
    const week = getWeekKey(cursorKey);
    const sessions = sessionsByWeek.get(week) ?? 0;
    if (sessions < safeTarget) break;
    streak += 1;
    cursorKey = shiftLocalDateKey(cursorKey, -7);
  }

  return {
    sessionsThisWeek,
    remainingThisWeek: Math.max(0, safeTarget - sessionsThisWeek),
    streak,
  };
}
