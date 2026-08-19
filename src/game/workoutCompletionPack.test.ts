import { describe, expect, it } from 'vitest';
import type { GrantedPack } from '../types';
import { findNewWorkoutPackId } from './workoutCompletionPack';

function pack(id: string, source: GrantedPack['source'], openedAt?: string): GrantedPack {
  return {
    id,
    packDefId: 'pack-workout',
    grantedAt: '2026-08-19T03:00:00.000Z',
    source,
    openedAt,
  };
}

describe('findNewWorkoutPackId', () => {
  it('ignores previously unopened packs and selects only the newly granted workout pack', () => {
    const existingIds = new Set(['pack-old']);
    const packs = [
      pack('pack-old', 'workout'),
      pack('pack-new', 'workout'),
    ];

    expect(findNewWorkoutPackId(packs, existingIds)).toBe('pack-new');
  });

  it('ignores opened packs and packs granted by other reward sources', () => {
    const existingIds = new Set<string>();
    const packs = [
      pack('pack-opened', 'workout', '2026-08-19T04:00:00.000Z'),
      pack('pack-set', 'set-completion'),
    ];

    expect(findNewWorkoutPackId(packs, existingIds)).toBeNull();
  });
});
