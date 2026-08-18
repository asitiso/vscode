// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, loadStateEnvelope, saveState } from './storage';

describe('storage migration', () => {
  beforeEach(() => localStorage.clear());

  it('초기 상태에 빈 사용자 운동 목록과 마일스톤 목록을 포함한다', () => {
    const state = createInitialState();
    expect(state.customExercises).toEqual([]);
    expect(state.claimedLevelMilestones).toEqual([]);
    expect(state.earnedBadges).toEqual([]);
    expect(state.unlockedCosmetics).toEqual([]);
  });

  it('이전 저장 데이터에 customExercises가 없으면 빈 배열을 채운다', () => {
    const oldState = { ...createInitialState() } as Partial<ReturnType<typeof createInitialState>>;
    delete oldState.customExercises;
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.customExercises).toEqual([]);
  });

  it('이전 저장 데이터에 마일스톤 필드가 없으면 빈 배열을 채운다', () => {
    const oldState = { ...createInitialState() } as Partial<ReturnType<typeof createInitialState>>;
    delete oldState.claimedLevelMilestones;
    delete oldState.earnedBadges;
    delete oldState.unlockedCosmetics;
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));

    const loaded = loadState();
    expect(loaded?.claimedLevelMilestones).toEqual([]);
    expect(loaded?.earnedBadges).toEqual([]);
    expect(loaded?.unlockedCosmetics).toEqual([]);
  });

  it('마일스톤 보상 데이터와 팩 출처를 보존한다', () => {
    const state = createInitialState();
    state.claimedLevelMilestones = [10];
    state.earnedBadges = ['level-10-explorer'];
    state.unlockedCosmetics = ['sports-headband'];
    state.grantedPacks = [{
      id: 'level-milestone-10',
      packDefId: 'pack-level-milestone',
      grantedAt: '2026-08-06T00:00:00.000Z',
      source: 'level-milestone',
      sourceMilestoneLevel: 10,
    }];
    localStorage.setItem('workout-card-game:v1', JSON.stringify(state));

    const loaded = loadState();
    expect(loaded?.claimedLevelMilestones).toEqual([10]);
    expect(loaded?.grantedPacks[0]).toMatchObject({ source: 'level-milestone', sourceMilestoneLevel: 10 });
  });

  it('기존 dailyMissions 필드는 무시하고 다른 데이터를 유지한다', () => {
    const oldState = {
      ...createInitialState(),
      dailyMissions: { '2026-08-06': { selectedMissionId: 'legacy' } },
    };
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    const loaded = loadState();
    expect(loaded?.workoutLogs).toEqual([]);
    expect('dailyMissions' in (loaded ?? {})).toBe(false);
  });

  it('기존 미션 보상팩은 제거한다', () => {
    const oldState = {
      ...createInitialState(),
      grantedPacks: [
        {
          id: 'legacy-mission-pack',
          packDefId: 'pack-daily-mission',
          grantedAt: '2026-08-06T00:00:00.000Z',
          source: 'daily-mission',
        },
      ],
    };
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.grantedPacks).toEqual([]);
  });

  it('저장 envelope의 savedAt을 읽을 때 그대로 보존한다', () => {
    const savedAt = '2026-08-18T10:15:30.000Z';
    saveState(createInitialState(), savedAt);
    expect(loadStateEnvelope()?.savedAt).toBe(savedAt);
  });
});
