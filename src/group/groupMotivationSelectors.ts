import type { GroupMemberSummary } from './groupTypes';

export type GroupRankingPeriod = 'today' | 'week';

export interface GroupChaseInfo {
  targetNickname: string;
  gapSeconds?: number;
  gapPercent?: number;
}

export interface GroupMotivationView {
  activeCount: number;
  totalSeconds: number;
  ranked: GroupMemberSummary[];
  myRank: number | null;
  chase: GroupChaseInfo | null;
}

export function buildGroupMotivationView(
  members: GroupMemberSummary[],
  currentUserId: string | undefined,
  period: GroupRankingPeriod,
): GroupMotivationView {
  const ranked = [...members].sort((a, b) => {
    if (period === 'today') {
      if (b.todaySeconds !== a.todaySeconds) return b.todaySeconds - a.todaySeconds;
      if (b.isActive !== a.isActive) return Number(b.isActive) - Number(a.isActive);
      return a.nickname.localeCompare(b.nickname, 'ko');
    }

    if (b.weeklyGoalPercent !== a.weeklyGoalPercent) return b.weeklyGoalPercent - a.weeklyGoalPercent;
    if (b.weeklySeconds !== a.weeklySeconds) return b.weeklySeconds - a.weeklySeconds;
    return a.nickname.localeCompare(b.nickname, 'ko');
  });

  const myIndex = currentUserId ? ranked.findIndex((member) => member.userId === currentUserId) : -1;
  const me = myIndex >= 0 ? ranked[myIndex] : null;
  const ahead = myIndex > 0 ? ranked[myIndex - 1] : null;

  let chase: GroupChaseInfo | null = null;
  if (me && ahead) {
    if (period === 'today') {
      chase = {
        targetNickname: ahead.nickname,
        gapSeconds: Math.max(0, ahead.todaySeconds - me.todaySeconds),
      };
    } else {
      chase = {
        targetNickname: ahead.nickname,
        gapPercent: Math.max(0, ahead.weeklyGoalPercent - me.weeklyGoalPercent),
        gapSeconds: Math.max(0, ahead.weeklySeconds - me.weeklySeconds),
      };
    }
  }

  return {
    activeCount: members.filter((member) => member.isActive).length,
    totalSeconds: members.reduce(
      (sum, member) => sum + (period === 'today' ? member.todaySeconds : member.weeklySeconds),
      0,
    ),
    ranked,
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    chase,
  };
}
