// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountRevisionConflictError } from './accountCloudStorage';
import { saveAccountSyncMetadata } from './accountSyncMetadata';
import { GameProvider, useGame } from './GameContext';
import { createInitialState, saveState } from './storage';

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

const observed = {
  game: null as ReturnType<typeof useGame> | null,
};

const syncedAt = '2026-08-18T10:00:00.000Z';
const updatedAt = '2026-08-18T10:00:01.000Z';

function makeServerRecord(revision = 1, name = '서버 데이터') {
  const state = createInitialState();
  state.user.name = name;
  return {
    state,
    schemaVersion: 1,
    revision,
    clientSavedAt: syncedAt,
    updatedAt,
  };
}

function seedLinkedLocal(revision = 1, name = '로컬 데이터') {
  const state = createInitialState();
  state.user.name = name;
  saveState(state, syncedAt);
  saveAccountSyncMetadata({
    userId: 'user-1',
    serverRevision: revision,
    lastSyncedLocalSavedAt: syncedAt,
    lastServerUpdatedAt: updatedAt,
    linked: true,
  });
  return state;
}

function Probe() {
  const game = useGame();
  observed.game = game;
  return (
    <div>
      <span data-testid="status">{game.accountSyncStatus}</span>
      <span data-testid="name">{game.state.user.name}</span>
      <span data-testid="workout-count">{game.state.workoutLogs.length}</span>
      <span data-testid="conflict-revision">{game.accountConflict?.server.revision ?? ''}</span>
      <button type="button" onClick={() => game.setUserName('새 이름')}>name</button>
      <button
        type="button"
        onClick={() => game.completeWorkout([
          { exerciseId: 'squat', exerciseName: '스쿼트', exerciseLogType: 'weight-reps-sets', weightKg: 20, reps: 10, sets: 3 },
        ], 'moderate')}
      >
        workout
      </button>
      <button type="button" onClick={() => game.claimLevelMilestone(10, 10)}>milestone</button>
    </div>
  );
}

afterEach(() => cleanup());

describe('GameProvider account sync', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.user = null;
    observed.game = null;
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
      clientSavedAt: syncedAt,
      updatedAt,
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][2]).toBeNull();
  });

  it('prompts on first link when server and device data both exist', async () => {
    auth.user = { id: 'user-1' };
    const local = createInitialState();
    local.user.name = '기기 데이터';
    saveState(local, '2026-08-18T09:59:00.000Z');
    cloud.load.mockResolvedValue(makeServerRecord(4));

    render(<GameProvider><Probe /></GameProvider>);

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('conflict'));
    expect(screen.getByTestId('conflict-revision').textContent).toBe('4');
    expect(screen.getByTestId('name').textContent).toBe('기기 데이터');
    expect(cloud.save).not.toHaveBeenCalled();
  });

  it('uses newer server state automatically when linked local state is clean', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(3);
    cloud.load.mockResolvedValue(makeServerRecord(4, '최신 서버'));

    render(<GameProvider><Probe /></GameProvider>);

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('최신 서버'));
    expect(screen.getByTestId('status').textContent).toBe('linked');
    expect(cloud.save).not.toHaveBeenCalled();
  });

  it('does not immediately save lightweight changes but saves post-workout state', async () => {
    auth.user = { id: 'user-1' };
    cloud.load.mockResolvedValue(null);
    cloud.save
      .mockResolvedValueOnce({
        schemaVersion: 1,
        revision: 1,
        clientSavedAt: syncedAt,
        updatedAt,
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

  it('saves level milestone rewards using the post-reducer snapshot', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(1);
    cloud.load.mockResolvedValue(makeServerRecord(1, '로컬 데이터'));
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 2,
      clientSavedAt: '2026-08-18T10:01:00.000Z',
      updatedAt: '2026-08-18T10:01:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    fireEvent.click(screen.getByText('milestone'));

    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][0].claimedLevelMilestones).toContain(10);
    expect(cloud.save.mock.calls[0][0].grantedPacks).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'level-milestone', sourceMilestoneLevel: 10 })]),
    );
    expect(cloud.save.mock.calls[0][2]).toBe(1);
  });

  it('flushes one dirty snapshot when the document becomes hidden and skips a clean repeat', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(1);
    cloud.load.mockResolvedValue(makeServerRecord(1, '로컬 데이터'));
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 2,
      clientSavedAt: '2026-08-18T10:02:00.000Z',
      updatedAt: '2026-08-18T10:02:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
    cloud.save.mockClear();

    fireEvent.click(screen.getByText('name'));
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('새 이름'));

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][2]).toBe(1);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    cloud.save.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(cloud.save).not.toHaveBeenCalled();
    visibility.mockRestore();
  });

  it('keeps the local action and enters conflict when the server revision advanced', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(3);
    const currentServer = makeServerRecord(3, '로컬 데이터');
    const latestServer = makeServerRecord(4, '다른 기기 데이터');
    cloud.load
      .mockResolvedValueOnce(currentServer)
      .mockResolvedValueOnce(latestServer);
    cloud.save.mockRejectedValueOnce(new AccountRevisionConflictError(4));

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    fireEvent.click(screen.getByText('workout'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('conflict'));
    expect(screen.getByTestId('workout-count').textContent).toBe('1');
    expect(screen.getByTestId('conflict-revision').textContent).toBe('4');
    expect((localStorage.getItem('workout-card-game:v1') ?? '')).toContain('workoutLogs');
  });

  it('serializes two important saves and uses the revision returned by the first save', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(1);
    cloud.load.mockResolvedValue(makeServerRecord(1, '로컬 데이터'));

    let resolveFirst!: (value: any) => void;
    let resolveSecond!: (value: any) => void;
    cloud.save
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    fireEvent.click(screen.getByText('workout'));
    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][0].workoutLogs).toHaveLength(1);
    expect(cloud.save.mock.calls[0][2]).toBe(1);

    fireEvent.click(screen.getByText('workout'));
    await Promise.resolve();
    expect(cloud.save).toHaveBeenCalledTimes(1);

    resolveFirst({
      schemaVersion: 1,
      revision: 2,
      clientSavedAt: '2026-08-18T10:03:00.000Z',
      updatedAt: '2026-08-18T10:03:01.000Z',
    });

    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(2));
    expect(cloud.save.mock.calls[1][0].workoutLogs).toHaveLength(2);
    expect(cloud.save.mock.calls[1][2]).toBe(2);

    resolveSecond({
      schemaVersion: 1,
      revision: 3,
      clientSavedAt: '2026-08-18T10:04:00.000Z',
      updatedAt: '2026-08-18T10:04:01.000Z',
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
  });

  it('saves dirty account data before sign out', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(1);
    cloud.load.mockResolvedValue(makeServerRecord(1, '로컬 데이터'));
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 2,
      clientSavedAt: '2026-08-18T10:05:00.000Z',
      updatedAt: '2026-08-18T10:05:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
    fireEvent.click(screen.getByText('name'));
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('새 이름'));

    let result: 'ready' | 'save-failed' | undefined;
    await act(async () => {
      result = await observed.game!.prepareAccountSignOut();
    });

    expect(result).toBe('ready');
    expect(cloud.save).toHaveBeenCalledTimes(1);
    expect(cloud.save.mock.calls[0][2]).toBe(1);
  });

  it('blocks automatic sign out when the dirty save fails and keeps local data', async () => {
    auth.user = { id: 'user-1' };
    seedLinkedLocal(1);
    cloud.load.mockResolvedValue(makeServerRecord(1, '로컬 데이터'));
    cloud.save.mockRejectedValue(new Error('network'));

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
    fireEvent.click(screen.getByText('name'));
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('새 이름'));

    let result: 'ready' | 'save-failed' | undefined;
    await act(async () => {
      result = await observed.game!.prepareAccountSignOut();
    });

    expect(result).toBe('save-failed');
    expect((localStorage.getItem('workout-card-game:v1') ?? '')).toContain('새 이름');
  });

  it('applies the explicit server choice without overwriting the server', async () => {
    auth.user = { id: 'user-1' };
    const local = createInitialState();
    local.user.name = '기기 데이터';
    saveState(local, '2026-08-18T09:59:00.000Z');
    cloud.load.mockResolvedValue(makeServerRecord(4, '계정 데이터'));

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('conflict'));

    await act(async () => {
      await observed.game!.resolveAccountConflict('server');
    });

    expect(screen.getByTestId('name').textContent).toBe('계정 데이터');
    expect(screen.getByTestId('status').textContent).toBe('linked');
    expect(cloud.save).not.toHaveBeenCalled();
  });

  it('writes the explicit device choice against the latest server revision', async () => {
    auth.user = { id: 'user-1' };
    const local = createInitialState();
    local.user.name = '기기 데이터';
    saveState(local, '2026-08-18T09:59:00.000Z');
    cloud.load.mockResolvedValue(makeServerRecord(4, '계정 데이터'));
    cloud.save.mockResolvedValue({
      schemaVersion: 1,
      revision: 5,
      clientSavedAt: '2026-08-18T10:06:00.000Z',
      updatedAt: '2026-08-18T10:06:01.000Z',
    });

    render(<GameProvider><Probe /></GameProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('conflict'));

    await act(async () => {
      await observed.game!.resolveAccountConflict('device');
    });

    expect(cloud.save).toHaveBeenCalledTimes(1);
    expect(cloud.save.mock.calls[0][0].user.name).toBe('기기 데이터');
    expect(cloud.save.mock.calls[0][2]).toBe(4);
    expect(screen.getByTestId('status').textContent).toBe('linked');
  });

  it('uses the revision created by an important save that races first account linking', async () => {
    auth.user = { id: 'user-1' };

    let resolveLoad!: (value: null) => void;
    cloud.load.mockReturnValue(new Promise<null>((resolve) => { resolveLoad = resolve; }));

    let resolveFirstSave!: (value: {
      schemaVersion: number;
      revision: number;
      clientSavedAt: string;
      updatedAt: string;
    }) => void;
    cloud.save
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirstSave = resolve; }))
      .mockResolvedValueOnce({
        schemaVersion: 1,
        revision: 2,
        clientSavedAt: '2026-08-18T10:01:00.000Z',
        updatedAt: '2026-08-18T10:01:01.000Z',
      });

    render(<GameProvider><Probe /></GameProvider>);
    fireEvent.click(screen.getByText('workout'));
    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(1));
    expect(cloud.save.mock.calls[0][2]).toBeNull();

    resolveLoad(null);
    await Promise.resolve();
    resolveFirstSave({
      schemaVersion: 1,
      revision: 1,
      clientSavedAt: syncedAt,
      updatedAt,
    });

    await waitFor(() => expect(cloud.save).toHaveBeenCalledTimes(2));
    expect(cloud.save.mock.calls[1][2]).toBe(1);
  });
});
