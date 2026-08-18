import type { AccountCloudSaveRecord } from './accountCloudStorage';
import type { AccountSyncMetadata } from './accountSyncMetadata';

export type AccountReconciliationDecision = 'upload-local' | 'keep-local' | 'use-server' | 'prompt';

export interface AccountReconciliationInput {
  metadata: AccountSyncMetadata | null;
  serverRecord: AccountCloudSaveRecord | null;
  localSavedAt: string | null;
  localDirty: boolean;
}

export function decideAccountReconciliation({
  metadata,
  serverRecord,
  localDirty,
}: AccountReconciliationInput): AccountReconciliationDecision {
  if (!serverRecord) return 'upload-local';
  if (!metadata?.linked) return 'prompt';
  if (serverRecord.revision === metadata.serverRevision) return 'keep-local';
  if (!localDirty) return 'use-server';
  return 'prompt';
}

export interface AccountSaveQueue<TInput, TResult> {
  enqueue(input: TInput): Promise<TResult>;
}

export function createAccountSaveQueue<TInput, TResult>(
  saveFn: (input: TInput) => Promise<TResult>,
): AccountSaveQueue<TInput, TResult> {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    enqueue(input: TInput): Promise<TResult> {
      const result = tail.then(() => saveFn(input));
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
