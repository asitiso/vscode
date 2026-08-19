import type { GrantedPack } from '../types';

export function findNewWorkoutPackId(
  packs: GrantedPack[],
  existingPackIds: ReadonlySet<string>,
): string | null {
  for (let index = packs.length - 1; index >= 0; index -= 1) {
    const pack = packs[index];
    if (existingPackIds.has(pack.id)) continue;
    if (pack.source !== 'workout') continue;
    if (pack.openedAt) continue;
    return pack.id;
  }

  return null;
}
