import type { GroupMemberSummary } from './groupTypes';

export interface GroupQuestProgress {
  current: number;
  target: number;
  completed: boolean;
  progressPercent: number;
}

export interface GroupQuestMvp {
  member: GroupMemberSummary;
  score: number;
}

export interface GroupQuestView {
  attendance: GroupQuestProgress;
  time: GroupQuestProgress;
  goal: GroupQuestProgress;
  allCompleted: boolean;
  mvp: GroupQuestMvp | null;
}

function clampProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function progress(current: number, target: number, hasMembers: boolean): GroupQuestProgress {
  return {
    current,
    target,
    completed: hasMembers && target > 0 && current >= target,
    progressPercent: clampProgress(current, target),
  };
}

function normalizedSeconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizedGoal(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateGroupContributionScore(member: GroupMemberSummary): number {
  const seconds = normalizedSeconds(member.weeklySeconds);
  if (seconds <= 0) return 0;
  const goal = normalizedGoal(member.weeklyGoalPercent);
  const participation = 1;
  const time = Math.min(4, Math.floor(seconds / 1800));
  const halfGoal = goal >= 50 ? 1 : 0;
  const fullGoal = goal >= 100 ? 2 : 0;
  return participation + time + halfGoal + fullGoal;
}

export function buildGroupQuestView(members: GroupMemberSummary[]): GroupQuestView {
  const hasMembers = members.length > 0;
  const normalized = members.map((member) => ({
    member,
    seconds: normalizedSeconds(member.weeklySeconds),
    goal: normalizedGoal(member.weeklyGoalPercent),
  }));

  const attendanceCurrent = normalized.filter((item) => item.seconds > 0).length;
  const attendanceTarget = hasMembers ? Math.max(1, Math.ceil(members.length * 0.7)) : 0;
  const totalMinutes = Math.floor(normalized.reduce((sum, item) => sum + item.seconds, 0) / 60);
  const timeTarget = members.length * 60;
  const goalCurrent = normalized.filter((item) => item.goal >= 100).length;
  const goalTarget = hasMembers ? Math.max(1, Math.ceil(members.length * 0.5)) : 0;

  const attendance = progress(attendanceCurrent, attendanceTarget, hasMembers);
  const time = progress(totalMinutes, timeTarget, hasMembers);
  const goal = progress(goalCurrent, goalTarget, hasMembers);

  const ranked = normalized
    .map(({ member, seconds, goal: goalPercent }) => ({ member, seconds, goalPercent, score: calculateGroupContributionScore(member) }))
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      right.goalPercent - left.goalPercent ||
      right.seconds - left.seconds ||
      left.member.nickname.localeCompare(right.member.nickname, 'ko'),
    );

  return {
    attendance,
    time,
    goal,
    allCompleted: attendance.completed && time.completed && goal.completed,
    mvp: ranked[0] ? { member: ranked[0].member, score: ranked[0].score } : null,
  };
}
