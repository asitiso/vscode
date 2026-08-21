import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../lib/supabaseClient';
import { loadGroupDetail } from './groupApi';

vi.mock('../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));

function resolved<T>(data: T) {
  return Promise.resolve({ data, error: null });
}

describe('group detail team streak data', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T03:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns distinct daily participant counts from the existing weekly activity rows', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'groups') {
        return {
          select: () => ({
            eq: () => ({
              single: () => resolved({ id: 'g1', name: '우리팀', owner_id: 'u1', invite_code: 'ABC123' }),
            }),
          }),
        };
      }
      if (table === 'group_members') {
        return { select: () => ({ eq: () => resolved([{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }]) }) };
      }
      if (table === 'group_profiles') {
        return {
          select: () => ({
            in: () => resolved([
              { user_id: 'u1', nickname: '민수', weekly_goal_percent: 100 },
              { user_id: 'u2', nickname: '지수', weekly_goal_percent: 80 },
              { user_id: 'u3', nickname: '유나', weekly_goal_percent: 50 },
            ]),
          }),
        };
      }
      if (table === 'group_activity_daily') {
        return {
          select: () => ({
            in: () => ({
              gte: () => resolved([
                { user_id: 'u1', activity_date: '2026-08-17', workout_seconds: 1200 },
                { user_id: 'u2', activity_date: '2026-08-17', workout_seconds: 600 },
                { user_id: 'u1', activity_date: '2026-08-18', workout_seconds: 900 },
                { user_id: 'u2', activity_date: '2026-08-18', workout_seconds: 0 },
                { user_id: 'u3', activity_date: '2026-08-21', workout_seconds: 1800 },
              ]),
            }),
          }),
        };
      }
      if (table === 'workout_sessions') {
        return { select: () => ({ in: () => ({ is: () => resolved([]) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from,
    } as any);

    const detail = await loadGroupDetail('g1');

    expect(detail).toMatchObject({
      dailyParticipation: [
        { date: '2026-08-17', participantCount: 2 },
        { date: '2026-08-18', participantCount: 1 },
        { date: '2026-08-21', participantCount: 1 },
      ],
    });
  });
});
