import { describe, expect, it } from 'vitest';
import type { GrantedPack } from '../types';
import { findNewCompletionPackId } from './workoutCompletionPack';

function pack(id: string, source: GrantedPack['source'], openedAt?: string): GrantedPack {
  return {
    id,
    packDefId: source === 'weekly-goal' ? 'pack-weekly-goal' : 'pack-basic',
    grantedAt: '2026-08-19T03:00:00.000Z',
    source,
    openedAt,
  };
}

describe('findNewCompletionPackId', () => {
  it('ignores previously unopened packs and selects only a newly granted completion pack', () => {
    const existingIds = new Set(['pack-old']);
    const packs = [
      pack('pack-old', 'workout'),
      pack('pack-new', 'workout'),
    ];

    expect(findNewCompletionPackId(packs, existingIds)).toBe('pack-new');
  });

  it('prioritizes the weekly-goal reward when the same completion grants two packs', () => {
    const existingIds = new Set<string>();
    const packs = [
      pack('pack-workout', 'workout'),
      pack('pack-weekly', 'weekly-goal'),
    ];

    expect(findNewCompletionPackId(packs, existingIds)).toBe('pack-weekly');
  });

  it('ignores opened packs and unrelated reward sources', () => {
    const existingIds = new Set<string>();
    const packs = [
      pack('pack-opened', 'workout', '2026-08-19T04:00:00.000Z'),
      pack('pack-set', 'set-completion'),
    ];

    expect(findNewCompletionPackId(packs, existingIds)).toBeNull();
  });
});
