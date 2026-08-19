import type { GrantedPack } from '../types';

export function findNewCompletionPackId(
  packs: GrantedPack[],
  existingPackIds: ReadonlySet<string>,
): string | null {
  const newlyGranted = packs.filter((pack) => (
    !existingPackIds.has(pack.id)
    && !pack.openedAt
    && (pack.source === 'workout' || pack.source === 'weekly-goal')
  ));

  const weeklyReward = newlyGranted.find((pack) => pack.source === 'weekly-goal');
  if (weeklyReward) return weeklyReward.id;

  for (let index = newlyGranted.length - 1; index >= 0; index -= 1) {
    if (newlyGranted[index].source === 'workout') return newlyGranted[index].id;
  }

  return null;
}

/** @deprecated Use findNewCompletionPackId. */
export const findNewWorkoutPackId = findNewCompletionPackId;
