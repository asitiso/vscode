import { describe, expect, it, vi } from 'vitest';
import type { AccountCloudSaveRecord } from './accountCloudStorage';
import type { AccountSyncMetadata } from './accountSyncMetadata';
import { createInitialState } from './storage';
import { createAccountSaveQueue, decideAccountReconciliation } from './accountSyncCoordinator';

const localAt = '2026-08-18T10:00:05.000Z';
const syncedAt = '2026-08-18T10:00:00.000Z';
const serverRecord: AccountCloudSaveRecord = {
  state: createInitialState(),
  schemaVersion: 1,
  revision: 3,
  clientSavedAt: syncedAt,
  updatedAt: '2026-08-18T10:00:01.000Z',
};
const linkedRevision3: AccountSyncMetadata = {
  userId: 'user-a',
  serverRevision: 3,
  lastSyncedLocalSavedAt: syncedAt,
  lastServerUpdatedAt: serverRecord.updatedAt,
  linked: true,
};

describe('account sync reconciliation', () => {
  it('uploads local state when account has no server save', () => {
    expect(decideAccountReconciliation({
      metadata: null,
      serverRecord: null,
      localSavedAt: localAt,
      localDirty: true,
    })).toBe('upload-local');
  });

  it('prompts on first link when a server save exists', () => {
    expect(decideAccountReconciliation({
      metadata: null,
      serverRecord,
      localSavedAt: localAt,
      localDirty: true,
    })).toBe('prompt');
  });

  it('uses newer server state automatically when linked local state is clean', () => {
    expect(decideAccountReconciliation({
      metadata: linkedRevision3,
      serverRecord: { ...serverRecord, revision: 4 },
      localSavedAt: syncedAt,
      localDirty: false,
    })).toBe('use-server');
  });

  it('prompts when server advanced and local is dirty', () => {
    expect(decideAccountReconciliation({
      metadata: linkedRevision3,
      serverRecord: { ...serverRecord, revision: 4 },
      localSavedAt: localAt,
      localDirty: true,
    })).toBe('prompt');
  });

  it('keeps local state when linked server revision is unchanged', () => {
    expect(decideAccountReconciliation({
      metadata: linkedRevision3,
      serverRecord,
      localSavedAt: localAt,
      localDirty: true,
    })).toBe('keep-local');
  });
});

describe('account save queue', () => {
  it('never runs two account saves concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const secondGate = new Promise<void>((resolve) => { releaseSecond = resolve; });

    const saveFn = vi.fn(async (value: number) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await (value === 1 ? firstGate : secondGate);
      active -= 1;
      return value * 10;
    });
    const queue = createAccountSaveQueue(saveFn);
    const first = queue.enqueue(1);
    const second = queue.enqueue(2);

    await Promise.resolve();
    expect(maxActive).toBe(1);
    releaseFirst();
    await expect(first).resolves.toBe(10);
    releaseSecond();
    await expect(second).resolves.toBe(20);
    expect(maxActive).toBe(1);
  });

  it('continues after a rejected save', async () => {
    const saveFn = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('ok');
    const queue = createAccountSaveQueue(saveFn);
    await expect(queue.enqueue('first')).rejects.toThrow('network');
    await expect(queue.enqueue('second')).resolves.toBe('ok');
  });
});
