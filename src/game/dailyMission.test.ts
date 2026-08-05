import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { evaluateDailyMission, generateDailyMissions } from './dailyMission';

const log = (date: string, exerciseIds: string[]): WorkoutLog => ({
  id: `log-${date}-${exerciseIds.join('-')}`,
  date,
  entries: exerciseIds.map((exerciseId) => ({ exerciseId })),
  feeling: 'easy',
  grantedPackIds: [],
  createdAt: `${date}T09:00:00.000Z`,
});

describe('generateDailyMissions', () => {
  it('항상 쉬움·보통·어려움 3개를 만든다', () => {
    const missions = generateDailyMissions('2026-08-05', [], 'lower-body-machines');
    expect(missions.map((mission) => mission.difficulty)).toEqual(['easy', 'normal', 'hard']);
  });

  it('최근 기록이 2회 미만이면 기본 미션을 사용한다', () => {
    const missions = generateDailyMissions(
      '2026-08-05',
      [log('2026-08-04', ['treadmill'])],
      'lower-body-machines',
    );
    expect(missions[0]).toMatchObject({ kind: 'category-one', category: 'cardio', targetCount: 1 });
    expect(missions[1]).toMatchObject({ kind: 'any-two', targetCount: 2 });
    expect(missions[2]).toMatchObject({
      kind: 'focus-set-two',
      focusSetId: 'lower-body-machines',
      targetCount: 2,
    });
  });

  it('최근 14일 빈도 상위 두 카테고리를 쉬움과 보통에 사용한다', () => {
    const logs = [
      log('2026-08-04', ['leg-press', 'leg-curl']),
      log('2026-08-03', ['leg-extension']),
      log('2026-08-02', ['treadmill']),
      log('2026-08-01', ['stationary-bike']),
    ];
    const missions = generateDailyMissions('2026-08-05', logs, 'back-pull');
    expect(missions[0].category).toBe('legs');
    expect(missions[1].category).toBe('cardio');
  });
});

describe('evaluateDailyMission', () => {
  it('당일 여러 기록의 서로 다른 운동 ID를 합산한다', () => {
    const mission = generateDailyMissions(
      '2026-08-05',
      [
        log('2026-08-04', ['leg-press']),
        log('2026-08-03', ['leg-curl']),
      ],
      'back-pull',
    )[0];
    const result = evaluateDailyMission(
      { ...mission, kind: 'category-two', targetCount: 2, category: 'legs' },
      '2026-08-05',
      [log('2026-08-05', ['leg-press']), log('2026-08-05', ['leg-curl'])],
    );
    expect(result).toEqual({ current: 2, target: 2, completed: true });
  });

  it('같은 운동을 여러 번 기록해도 한 종으로 계산한다', () => {
    const mission = generateDailyMissions('2026-08-05', [], 'back-pull')[1];
    expect(
      evaluateDailyMission(mission, '2026-08-05', [
        log('2026-08-05', ['treadmill']),
        log('2026-08-05', ['treadmill']),
      ]),
    ).toEqual({ current: 1, target: 2, completed: false });
  });
});
