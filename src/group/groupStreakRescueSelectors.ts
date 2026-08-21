import type { GroupMemberSummary } from './groupTypes';

export interface GroupStreakRescueView {
  candidates: GroupMemberSummary[];
  remainingCount: number;
}

export function buildGroupStreakRescueView({
  members,
  currentUserId,
  limit = 3,
}: {
  members: GroupMemberSummary[];
  currentUserId?: string;
  limit?: number;
}): GroupStreakRescueView {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 3;
  const eligible = members
    .filter((member) => member.userId !== currentUserId && member.todaySeconds <= 0 && !member.isActive)
    .slice()
    .sort((left, right) => left.nickname.localeCompare(right.nickname, 'ko'));

  return {
    candidates: eligible.slice(0, safeLimit),
    remainingCount: Math.max(0, eligible.length - safeLimit),
  };
}
