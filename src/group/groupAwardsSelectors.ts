import type { GroupMemberSummary } from './groupTypes';
import { buildGroupQuestView, calculateGroupContributionScore } from './groupQuestSelectors';

export interface TodayFlameAward {
  member: GroupMemberSummary;
  todaySeconds: number;
}

export interface GoalHunterAward {
  member: GroupMemberSummary;
  weeklyGoalPercent: number;
}

export interface HiddenHeroAward {
  member: GroupMemberSummary;
  score: number;
}

export interface GroupAwardsView {
  todayFlame: TodayFlameAward | null;
  goalHunter: GoalHunterAward | null;
  hiddenHero: HiddenHeroAward | null;
  mvpUserId: string | null;
}

function normalized(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function byNickname(left: GroupMemberSummary, right: GroupMemberSummary): number {
  return left.nickname.localeCompare(right.nickname, 'ko');
}

export function buildGroupAwardsView(members: GroupMemberSummary[]): GroupAwardsView {
  const used = new Set<string>();
  const mvpUserId = buildGroupQuestView(members).mvp?.member.userId ?? null;

  const todayWinner = members
    .filter((member) => normalized(member.todaySeconds) > 0)
    .slice()
    .sort((left, right) => normalized(right.todaySeconds) - normalized(left.todaySeconds) || byNickname(left, right))[0];

  const todayFlame = todayWinner
    ? { member: todayWinner, todaySeconds: normalized(todayWinner.todaySeconds) }
    : null;
  if (todayWinner) used.add(todayWinner.userId);

  const goalWinner = members
    .filter((member) => !used.has(member.userId) && normalized(member.weeklyGoalPercent) > 0)
    .slice()
    .sort((left, right) => normalized(right.weeklyGoalPercent) - normalized(left.weeklyGoalPercent) || byNickname(left, right))[0];

  const goalHunter = goalWinner
    ? { member: goalWinner, weeklyGoalPercent: normalized(goalWinner.weeklyGoalPercent) }
    : null;
  if (goalWinner) used.add(goalWinner.userId);

  const hiddenWinner = members
    .map((member) => ({ member, score: calculateGroupContributionScore(member) }))
    .filter(({ member, score }) => score > 0 && member.userId !== mvpUserId && !used.has(member.userId))
    .sort((left, right) => right.score - left.score || byNickname(left.member, right.member))[0];

  return {
    todayFlame,
    goalHunter,
    hiddenHero: hiddenWinner ?? null,
    mvpUserId,
  };
}
