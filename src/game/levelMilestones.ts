const BADGES: Record<number, { id: string; label: string }> = {
  10: { id: 'level-10-explorer', label: 'Explorer' },
  20: { id: 'level-20-challenger', label: 'Challenger' },
  30: { id: 'level-30-elite', label: 'Elite' },
  40: { id: 'level-40-master', label: 'Master' },
  50: { id: 'level-50-legend', label: 'Legend' },
};

const COSMETICS: Record<number, { id: string; label: string }> = {
  10: { id: 'sports-headband', label: '스포츠 헤드밴드' },
  20: { id: 'medal', label: '메달' },
  30: { id: 'cape', label: '망토' },
  40: { id: 'golden-aura', label: '황금 오라' },
  50: { id: 'crown', label: '왕관' },
};

export function isLevelMilestone(level: number): boolean {
  return Number.isInteger(level) && level >= 10 && level % 10 === 0;
}

export function getPendingLevelMilestone(currentLevel: number, claimed: readonly number[]): number | null {
  const claimedSet = new Set(claimed);
  for (let level = 10; level <= currentLevel; level += 10) {
    if (!claimedSet.has(level)) return level;
  }
  return null;
}

export function getMilestoneBadge(level: number): { id: string; label: string } {
  return BADGES[level] ?? { id: `level-${level}-milestone`, label: `Lv.${level} Milestone` };
}

export function getMilestoneCosmetic(level: number): { id: string; label: string } {
  return COSMETICS[level] ?? { id: `milestone-${level}`, label: `Lv.${level} 장식` };
}

export function getMilestoneDialogue(level: number, characterName = '운동 파트너'): string {
  return `${characterName}가 축하해요! Lv.${level}까지 꾸준히 성장한 특별 보상을 받아 보세요.`;
}

export function getHighestEarnedMilestoneBadge(claimed: readonly number[]): { id: string; label: string; level: number } | null {
  const highest = claimed.filter(isLevelMilestone).sort((a, b) => b - a)[0];
  if (!highest) return null;
  return { ...getMilestoneBadge(highest), level: highest };
}
