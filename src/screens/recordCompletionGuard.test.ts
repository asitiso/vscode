import { describe, expect, it, vi } from 'vitest';
import { createRecordCompletionGuard } from './recordCompletionGuard';

describe('createRecordCompletionGuard', () => {
  it('runs one completion action while an earlier completion is still pending', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const action = vi.fn(async () => {
      await pending;
      return 'saved';
    });
    const guard = createRecordCompletionGuard();

    const first = guard.run(action);
    const second = guard.run(action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    release();
    await expect(first).resolves.toBe('saved');
  });

  it('allows another completion after the previous action finishes', async () => {
    const action = vi.fn(async () => 'saved');
    const guard = createRecordCompletionGuard();

    await guard.run(action);
    await guard.run(action);

    expect(action).toHaveBeenCalledTimes(2);
  });
});
