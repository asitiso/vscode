import type { WorkoutLog } from '../types';

/** 월요일 시작 기준 ISO 주차 키 (예: "2026-W32") */
export function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = (date.getDay() + 6) % 7; // 월=0 ... 일=6
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);

  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);

  const weekNum = Math.round((monday.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1;
  return `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** 로그를 주차별 "운동한 날짜 수"로 집계한다 (하루 여러 번 기록해도 1일로 계산) */
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
 * 이번 주 진행 상황과, 목표를 달성한 "완료된" 주가 몇 주 연속 이어지고 있는지 계산한다.
 * 이번 주는 아직 진행 중이므로 실패로 세지 않는다 (CLAUDE.md 3-4절: 실패감 최소화).
 */
export function computeWeeklyProgress(
  logs: WorkoutLog[],
  targetSessionsPerWeek: number,
  today = new Date(),
): { sessionsThisWeek: number; remainingThisWeek: number; streak: number } {
  const sessionsByWeek = countSessionsByWeek(logs);
  const todayStr = today.toISOString().slice(0, 10);
  const currentWeek = getWeekKey(todayStr);
  const sessionsThisWeek = sessionsByWeek.get(currentWeek) ?? 0;

  // 지난 주부터 거꾸로 훑으며 목표 달성 여부를 확인한다.
  let streak = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 7);
  for (let i = 0; i < 104; i++) {
    // 최대 2년치만 확인 (무한루프 방지)
    const week = getWeekKey(cursor.toISOString().slice(0, 10));
    const sessions = sessionsByWeek.get(week) ?? 0;
    if (sessions >= targetSessionsPerWeek) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }

  return {
    sessionsThisWeek,
    remainingThisWeek: Math.max(0, targetSessionsPerWeek - sessionsThisWeek),
    streak,
  };
}
