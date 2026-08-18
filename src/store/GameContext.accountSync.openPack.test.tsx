// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAccountSyncMetadata } from './accountSyncMetadata';
import { GameProvider, useGame } from './GameContext';
import { createInitialState, saveState } from './storage';

const auth = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }));
const cloud = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));

vi.mock('../group/GroupAuthContext', () => ({
  useGroupAuth: () => ({ user: auth.user }),
}));

vi.mock('./accountCloudStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./accountCloudStorage')>();
  return {
    ...actual,
    loadAccountCloudState: cloud.load,
    saveAccountCloudState: cloud.save,
  };
});

const syncedAt = '2026-08-18T10:00:00.000Z';
const updatedAt = '2026-08-18T10:00:01.000Z';

function Probe() {
  const game = useGame();
  return (
    <div>
      <span data-testid="status">{game.accountSyncStatus}</span>
      <button type="button" onClick={() => game.openPack('open-me')}>open</button>
    </div>
  );
}

afterEach(() => cleanup());

describe('GameProvider account sync pack opening', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.user = { id: 'user-1' };
    cloud.load.mockReset();
    cloud.save.mockReset();
  });

  it('saves the post-reducer OPEN_PACK snapshot using the linked revision', async () => {
    const state = createInitialState();
    state.grantedPacks = [{
      id: 'open-me',
      packDefId: 'pack-level-milestone',
      grantedAt: syncedAt,
      source: 'level-milestone',
      sourceMilestoneLevel: 10,
    }];
    saveState(state, syncedAt);
    saveAccountSyncMetadata({
      userId: 'user-1',
      serverRevision: 1,
      lastSyncedLocalSavedAt: syncedAt,
      lastServerUpdatedAt: updatedAt,
      linked: true,
    });

    cloud.load.mockResolvedValue({
      state,
      schemaVersion: 1,
      revision: 1,
      clientSavedAt: syncedAt,
      updatedAt,
    });
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 2,
      clientSavedAt: '2026-08-18T10:01:00.000Z',
      updatedAt: '2026-08-18T10:01:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    fireEvent.click(screen.getByText('open'));

    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    const savedState = cloud.save.mock.calls[0][0];
    expect(savedState.grantedPacks.find((pack: { id: string }) => pack.id === 'open-me')?.openedAt).toBeTruthy();
    expect(Object.keys(savedState.ownedCards).length).toBeGreaterThan(0);
    expect(cloud.save.mock.calls[0][2]).toBe(1);
  });
});
