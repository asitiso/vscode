import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../lib/supabaseClient';
import { createInitialState } from './storage';
import {
  AccountRevisionConflictError,
  loadAccountCloudState,
  saveAccountCloudState,
} from './accountCloudStorage';

vi.mock('../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));

describe('account cloud storage', () => {
  const savedAt = '2026-08-18T10:00:00.000Z';
  const updatedAt = '2026-08-18T10:00:01.000Z';
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as any);
  });

  it('loads and normalizes an authenticated account snapshot', async () => {
    rpc.mockResolvedValue({
      data: [{
        state: createInitialState(),
        schema_version: 1,
        revision: 4,
        client_saved_at: savedAt,
        updated_at: updatedAt,
      }],
      error: null,
    });

    const result = await loadAccountCloudState();
    expect(rpc).toHaveBeenCalledWith('load_user_game_state');
    expect(result?.revision).toBe(4);
    expect(result?.clientSavedAt).toBe(savedAt);
  });

  it('returns null when the account has no server save', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(loadAccountCloudState()).resolves.toBeNull();
  });

  it('sends expected revision when saving', async () => {
    rpc.mockResolvedValue({
      data: [{
        status: 'saved',
        revision: 5,
        client_saved_at: savedAt,
        updated_at: updatedAt,
        schema_version: 1,
      }],
      error: null,
    });

    const state = createInitialState();
    await saveAccountCloudState(state, savedAt, 4);
    expect(rpc).toHaveBeenCalledWith('save_user_game_state', expect.objectContaining({
      p_state: state,
      p_client_saved_at: savedAt,
      p_schema_version: 1,
      p_expected_revision: 4,
    }));
  });

  it('throws a typed error on revision conflict', async () => {
    rpc.mockResolvedValue({
      data: [{
        status: 'conflict',
        revision: 7,
        client_saved_at: savedAt,
        updated_at: updatedAt,
        schema_version: 1,
      }],
      error: null,
    });

    const promise = saveAccountCloudState(createInitialState(), savedAt, 4);
    await expect(promise).rejects.toBeInstanceOf(AccountRevisionConflictError);
    await expect(promise).rejects.toMatchObject({ currentRevision: 7 });
  });
});
