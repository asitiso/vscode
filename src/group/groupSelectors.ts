import type { GroupMemberSummary } from './groupTypes';

export function rankGroupMembers(members: GroupMemberSummary[]): GroupMemberSummary[] {
  return [...members].sort((a, b) => {
    if (b.weeklyGoalPercent !== a.weeklyGoalPercent) return b.weeklyGoalPercent - a.weeklyGoalPercent;
    if (b.weeklySeconds !== a.weeklySeconds) return b.weeklySeconds - a.weeklySeconds;
    return a.nickname.localeCompare(b.nickname, 'ko');
  });
}

export function formatWorkoutSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}
