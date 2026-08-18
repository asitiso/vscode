import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAccountSyncMetadata,
  isLocalDirty,
  loadAccountSyncMetadata,
  saveAccountSyncMetadata,
} from './accountSyncMetadata';

describe('account sync metadata', () => {
  beforeEach(() => localStorage.clear());

  it('isolates metadata by auth user id', () => {
    saveAccountSyncMetadata({
      userId: 'user-a',
      serverRevision: 3,
      lastSyncedLocalSavedAt: '2026-08-18T10:00:00.000Z',
      lastServerUpdatedAt: '2026-08-18T10:00:01.000Z',
      linked: true,
    });
    expect(loadAccountSyncMetadata('user-a')?.serverRevision).toBe(3);
    expect(loadAccountSyncMetadata('user-b')).toBeNull();
  });

  it('treats a newer local envelope as dirty', () => {
    const meta = {
      userId: 'user-a',
      serverRevision: 3,
      lastSyncedLocalSavedAt: '2026-08-18T10:00:00.000Z',
      lastServerUpdatedAt: '2026-08-18T10:00:01.000Z',
      linked: true,
    };
    expect(isLocalDirty('2026-08-18T10:00:02.000Z', meta)).toBe(true);
    expect(isLocalDirty('2026-08-18T10:00:00.000Z', meta)).toBe(false);
  });

  it('clears only the requested account metadata', () => {
    saveAccountSyncMetadata({
      userId: 'user-a',
      serverRevision: 1,
      lastSyncedLocalSavedAt: null,
      lastServerUpdatedAt: null,
      linked: true,
    });
    clearAccountSyncMetadata('user-a');
    expect(loadAccountSyncMetadata('user-a')).toBeNull();
  });
});
