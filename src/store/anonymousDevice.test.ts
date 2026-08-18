// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAnonymousDeviceHash,
  getOrCreateAnonymousDeviceSecret,
} from './anonymousDevice';

describe('anonymousDevice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates one stable 64-character hex secret per browser storage', () => {
    const first = getOrCreateAnonymousDeviceSecret();
    const second = getOrCreateAnonymousDeviceSecret();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
  });

  it('returns a SHA-256 hex digest instead of the raw secret', async () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint8Array).fill(1);
      return array;
    });

    const secret = getOrCreateAnonymousDeviceSecret();
    const digest = await getAnonymousDeviceHash();

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe(secret);
  });
});
