import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../lib/supabaseClient';
import { loadGroupDailyCheerSummary, sendGroupDailyCheer } from './groupApi';

vi.mock('../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));

describe('daily group cheer API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the anonymous daily summary returned by Supabase', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ fire_count: 2, clap_count: 1, together_count: 3, my_selection: 'clap' }],
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as any);

    await expect(loadGroupDailyCheerSummary('g1', 'u2')).resolves.toEqual({
      fire: 2,
      clap: 1,
      together: 3,
      mySelection: 'clap',
    });
    expect(rpc).toHaveBeenCalledWith('get_group_daily_cheer_summary', {
      p_group_id: 'g1',
      p_receiver_id: 'u2',
    });
  });

  it('normalizes malformed counts and unknown selection values', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ fire_count: '-2', clap_count: '4.8', together_count: null, my_selection: 'unknown' }],
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as any);

    await expect(loadGroupDailyCheerSummary('g1', 'u2')).resolves.toEqual({
      fire: 0,
      clap: 4,
      together: 0,
      mySelection: null,
    });
  });

  it('sends a cheer and returns the updated server summary in one round trip', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ fire_count: 0, clap_count: 2, together_count: 1, my_selection: 'clap' }],
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as any);

    await expect(sendGroupDailyCheer('g1', 'u2', 'clap')).resolves.toEqual({
      fire: 0,
      clap: 2,
      together: 1,
      mySelection: 'clap',
    });
    expect(rpc).toHaveBeenCalledWith('send_group_daily_cheer', {
      p_group_id: 'g1',
      p_receiver_id: 'u2',
      p_cheer_type: 'clap',
    });
  });

  it('maps cheer contract errors through the existing group API error style', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'SELF_CHEER_NOT_ALLOWED' } });
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as any);

    await expect(sendGroupDailyCheer('g1', 'u1', 'fire')).rejects.toMatchObject({
      name: 'GroupApiError',
      message: 'SELF_CHEER_NOT_ALLOWED',
    });
  });
});
