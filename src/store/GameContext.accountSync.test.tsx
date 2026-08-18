// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, useGame } from './GameContext';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
const cloud = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

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

function Probe() {
  const game = useGame();
  return (
    <div>
      <span data-testid="status">{game.accountSyncStatus}</span>
      <button type="button" onClick={() => game.setUserName('새 이름')}>name</button>
      <button
        type="button"
        onClick={() => game.completeWorkout([
          { exerciseId: 'squat', exerciseName: '스쿼트', exerciseLogType: 'weight-reps-sets', weightKg: 20, reps: 10, sets: 3 },
        ], 'moderate')}
      >
        workout
      </button>
    </div>
  );
}

afterEach(() => cleanup());

describe('GameProvider account sync', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.user = null;
    cloud.load.mockReset();
    cloud.save.mockReset();
  });

  it('keeps signed-out changes local and does not call account RPCs', async () => {
    render(<GameProvider><Probe /></GameProvider>);
    fireEvent.click(screen.getByText('name'));

    await waitFor(() => {
      const raw = localStorage.getItem('workout-card-game:v1') ?? '';
      expect(raw).toContain('새 이름');
    });
    expect(cloud.load).not.toHaveBeenCalled();
    expect(cloud.save).not.toHaveBeenCalled();
  });

  it('uploads local state once when the signed-in account has no save', async () => {
    auth.user = { id: 'user-1' };
    cloud.load.mockResolvedValue(null);
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 1,
      clientSavedAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][2]).toBeNull();
  });

  it('does not immediately save lightweight changes but saves post-workout state', async () => {
    auth.user = { id: 'user-1' };
    cloud.load.mockResolvedValue(null);
    cloud.save
      .mockResolvedValueOnce({
        schemaVersion: 1,
        revision: 1,
        clientSavedAt: '2026-08-18T10:00:00.000Z',
        updatedAt: '2026-08-18T10:00:01.000Z',
      })
      .mockResolvedValueOnce({
        schemaVersion: 1,
        revision: 2,
        clientSavedAt: '2026-08-18T10:01:00.000Z',
        updatedAt: '2026-08-18T10:01:01.000Z',
      });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
    cloud.save.mockClear();

    fireEvent.click(screen.getByText('name'));
    await waitFor(() => expect((localStorage.getItem('workout-card-game:v1') ?? '')).toContain('새 이름'));
    expect(cloud.save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('workout'));
    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    const savedState = cloud.save.mock.calls[0][0];
    expect(savedState.workoutLogs).toHaveLength(1);
    expect(cloud.save.mock.calls[0][2]).toBe(1);
  });
});
