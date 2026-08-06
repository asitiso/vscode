export const REWARD_ASSET_MANIFEST: Record<string, string> = {
  'pack-common': '/assets/packs/original premium mobile fitness collection game card pack.png',
  'pack-rare': '/assets/packs/original premium rare mobile fitness collection game booster pack.png',
  'pack-super-rare': '/assets/packs/original super-rare mobile fitness collection game booster pack.png',
  'pack-legendary': '/assets/packs/ultimate legendary mobile fitness collection game booster pack.png',
  'milestone-reward-chest': '/assets/packs/original milestone reward treasure chest.png',
  'level-up-effect': '/assets/packs/level-up celebration effect.png',
  'achievement-badges': '/assets/packs/original achievement badge icons.png',
  'daily-mission-complete': '/assets/packs/original daily mission completion mascot.png',
  'workout-streak': '/assets/packs/original workout streak flame mascot.png',
  'locked-card-silhouette': '/assets/packs/mysterious unrevealed exercise-machine collectible mascot.png',
};

export function resolveRewardAssetUrl(assetName: string): string | null {
  return REWARD_ASSET_MANIFEST[assetName] ?? null;
}
