const ACCOUNT_SYNC_KEY_PREFIX = 'workout-card-game:account-sync:v1:';

export interface AccountSyncMetadata {
  userId: string;
  serverRevision: number | null;
  lastSyncedLocalSavedAt: string | null;
  lastServerUpdatedAt: string | null;
  linked: boolean;
}

function key(userId: string): string {
  return `${ACCOUNT_SYNC_KEY_PREFIX}${userId}`;
}

function isValidTimestamp(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

export function loadAccountSyncMetadata(userId: string): AccountSyncMetadata | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountSyncMetadata>;
    if (parsed.userId !== userId) return null;
    if (parsed.serverRevision !== null && typeof parsed.serverRevision !== 'number') return null;
    if (!isValidTimestamp(parsed.lastSyncedLocalSavedAt ?? null)) return null;
    if (!isValidTimestamp(parsed.lastServerUpdatedAt ?? null)) return null;
    if (typeof parsed.linked !== 'boolean') return null;
    return {
      userId,
      serverRevision: parsed.serverRevision ?? null,
      lastSyncedLocalSavedAt: parsed.lastSyncedLocalSavedAt ?? null,
      lastServerUpdatedAt: parsed.lastServerUpdatedAt ?? null,
      linked: parsed.linked,
    };
  } catch {
    return null;
  }
}

export function saveAccountSyncMetadata(value: AccountSyncMetadata): void {
  try {
    localStorage.setItem(key(value.userId), JSON.stringify(value));
  } catch (error) {
    console.warn('계정 동기화 메타데이터 저장에 실패했습니다.', error);
  }
}

export function clearAccountSyncMetadata(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch (error) {
    console.warn('계정 동기화 메타데이터 삭제에 실패했습니다.', error);
  }
}

export function isLocalDirty(
  localSavedAt: string | null,
  metadata: AccountSyncMetadata | null,
): boolean {
  if (!localSavedAt) return false;
  if (!metadata?.lastSyncedLocalSavedAt) return true;
  const localTime = Date.parse(localSavedAt);
  const syncedTime = Date.parse(metadata.lastSyncedLocalSavedAt);
  if (Number.isNaN(localTime) || Number.isNaN(syncedTime)) return true;
  return localTime > syncedTime;
}
