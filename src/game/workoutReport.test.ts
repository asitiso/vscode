import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import {
  buildDailyReport,
  buildMonthlyReport,
  buildWeeklyReport,
  getPreviousPeriodDelta,
  getWeekStart,
} from './workoutReport';

const log = (
  date: string,
  entries: WorkoutLog['entries'],
  id = date,
  personalBestExerciseIds?: string[],
): WorkoutLog => ({
  id: `log-${id}`,
  date,
  entries,
  feeling: 'moderate',
  personalBestExerciseIds,
  grantedPackIds: [],
  createdAt: `${date}T09:00:00.000Z`,
});

describe('getWeekStart', () => {
  it('일요일도 같은 주의 월요일을 반환한다', () => {
    expect(getWeekStart('2026-08-09')).toBe('2026-08-03');
  });
});

describe('buildWeeklyReport', () => {
  it('월요일부터 일요일까지 집계한다', () => {
    const report = buildWeeklyReport([
      log('2026-08-03', [{ exerciseId: 'leg-press', sets: 3, reps: 10 }], 'a'),
      log('2026-08-09', [{ exerciseId: 'treadmill', durationMinutes: 20 }], 'b'),
      log('2026-08-10', [{ exerciseId: 'lat-pulldown', sets: 3, reps: 8 }], 'c'),
    ], '2026-08-03');

    expect(report.totals).toMatchObject({
      activeDays: 2,
      logCount: 2,
      exerciseCount: 2,
      durationMinutes: 20,
      sets: 3,
      reps: 30,
    });
  });

  it('같은 운동을 같은 날 여러 번 기록해도 인기 운동 날짜 수는 1만 증가한다', () => {
    const report = buildWeeklyReport([
      log('2026-08-03', [{ exerciseId: 'leg-press' }], 'a'),
      log('2026-08-03', [{ exerciseId: 'leg-press' }], 'b'),
      log('2026-08-04', [{ exerciseId: 'treadmill' }], 'c'),
    ], '2026-08-03');

    expect(report.topExercises.find((item) => item.exerciseId === 'leg-press')).toMatchObject({
      exerciseId: 'leg-press',
      activeDays: 1,
    });
  });

  it('자동 신기록 종목 수를 합산하고 레거시 수동 신기록은 1개로 집계한다', () => {
    const automatic = log(
      '2026-08-03',
      [{ exerciseId: 'leg-press' }, { exerciseId: 'lat-pulldown' }],
      'auto',
      ['leg-press', 'lat-pulldown'],
    );
    const legacy = log('2026-08-04', [{ exerciseId: 'treadmill' }], 'legacy');
    legacy.personalBestExerciseIds = undefined;
    legacy.feeling = 'personal-best';

    const report = buildWeeklyReport([automatic, legacy], '2026-08-03');

    expect(report.totals.personalBests).toBe(3);
    expect(report.days.find((day) => day.date === '2026-08-03')?.totals.personalBests).toBe(2);
    expect(report.days.find((day) => day.date === '2026-08-04')?.totals.personalBests).toBe(1);
  });
});

describe('buildDailyReport', () => {
  it('삭제된 사용자 운동은 기록에 저장된 이름을 사용한다', () => {
    const report = buildDailyReport([
      log('2026-08-05', [{ exerciseId: 'custom-deleted', exerciseName: '힙 밴드 걷기', durationMinutes: 15 }]),
    ], '2026-08-05');

    expect(report.exercises[0].name).toBe('힙 밴드 걷기');
  });
});

describe('buildMonthlyReport', () => {
  it('기록이 없는 달도 0 통계를 반환한다', () => {
    expect(buildMonthlyReport([], 2026, 8).totals).toEqual({
      activeDays: 0,
      logCount: 0,
      exerciseCount: 0,
      durationMinutes: 0,
      sets: 0,
      reps: 0,
      personalBests: 0,
    });
  });
});

describe('getPreviousPeriodDelta', () => {
  it('현재 값에서 이전 값을 뺀 절대 증감을 반환한다', () => {
    const current = buildWeeklyReport([
      log('2026-08-03', [{ exerciseId: 'treadmill', durationMinutes: 30 }], 'current', ['treadmill']),
      log('2026-08-04', [{ exerciseId: 'leg-press' }], 'current-2', ['leg-press']),
    ], '2026-08-03');
    const previous = buildWeeklyReport([
      log('2026-07-27', [{ exerciseId: 'treadmill', durationMinutes: 10 }], 'previous', ['treadmill']),
    ], '2026-07-27');
    const delta = getPreviousPeriodDelta(current, previous);
    expect(delta.durationMinutes).toBe(20);
    expect(delta.personalBests).toBe(1);
  });
});
