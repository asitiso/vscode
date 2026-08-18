import { useMemo, useState } from 'react';
import { formatWorkoutSeconds } from '../../group/groupSelectors';
import {
  buildGroupMotivationView,
  type GroupRankingPeriod,
} from '../../group/groupMotivationSelectors';
import type { GroupMemberSummary } from '../../group/groupTypes';

interface GroupMotivationPanelProps {
  members: GroupMemberSummary[];
  currentUserId?: string;
  onSelectMember: (member: GroupMemberSummary) => void;
  onRemoveMember?: (member: GroupMemberSummary) => void;
  canRemoveMembers?: boolean;
}

function chaseLabel(period: GroupRankingPeriod, targetNickname: string, gapSeconds?: number, gapPercent?: number) {
  if (period === 'today') return `${targetNickname}님까지 ${formatWorkoutSeconds(gapSeconds ?? 0)}`;
  if ((gapPercent ?? 0) > 0) return `${targetNickname}님까지 목표 ${gapPercent}%p`;
  return `${targetNickname}님까지 ${formatWorkoutSeconds(gapSeconds ?? 0)}`;
}

export function GroupMotivationPanel({
  members,
  currentUserId,
  onSelectMember,
  onRemoveMember,
  canRemoveMembers = false,
}: GroupMotivationPanelProps) {
  const [period, setPeriod] = useState<GroupRankingPeriod>('today');
  const view = useMemo(
    () => buildGroupMotivationView(members, currentUserId, period),
    [members, currentUserId, period],
  );

  return (
    <section className="group-motivation">
      <div className="group-live-summary">
        <div>
          <span className="group-live-summary__eyebrow">LIVE WORKOUT</span>
          <strong>🔥 지금 {view.activeCount}명 운동 중</strong>
          <small>{period === 'today' ? '오늘' : '이번 주'} 총 {formatWorkoutSeconds(view.totalSeconds)}</small>
        </div>
        <div className="group-live-summary__pulse" aria-hidden="true" />
      </div>

      <div className="group-ranking-tabs" role="tablist" aria-label="그룹 운동 순위 기간">
        <button type="button" role="tab" aria-selected={period === 'today'} aria-label="오늘 순위" className={period === 'today' ? 'is-active' : ''} onClick={() => setPeriod('today')}>오늘</button>
        <button type="button" role="tab" aria-selected={period === 'week'} aria-label="이번 주 순위" className={period === 'week' ? 'is-active' : ''} onClick={() => setPeriod('week')}>이번 주</button>
      </div>

      {view.myRank !== null && (
        <div className="group-my-rank">
          <span>내 순위 {view.myRank}위</span>
          {view.chase ? <strong>↑ {chaseLabel(period, view.chase.targetNickname, view.chase.gapSeconds, view.chase.gapPercent)}</strong> : <strong>🏆 지금 1위예요</strong>}
        </div>
      )}

      <div className="group-member-list group-member-list--ranking">
        {view.ranked.map((member, index) => {
          const isMe = member.userId === currentUserId;
          return (
            <div className={`group-member-row ${member.isActive ? 'is-active' : ''} ${isMe ? 'is-me' : ''}`} key={member.userId}>
              <button type="button" className="group-member-main" onClick={() => onSelectMember(member)}>
                <span className={`group-rank ${index < 3 ? `group-rank--top-${index + 1}` : ''}`}>{index + 1}</span>
                <span className="group-member-copy">
                  <strong>{member.nickname}{isMe ? ' · 나' : ''}{member.isOwner ? ' · 그룹장' : ''}</strong>
                  <small>{period === 'today' ? `오늘 ${formatWorkoutSeconds(member.todaySeconds)}` : `이번 주 ${formatWorkoutSeconds(member.weeklySeconds)}`}</small>
                  {period === 'week' && <span className="group-goal-progress"><i style={{ width: `${Math.min(100, member.weeklyGoalPercent)}%` }} /></span>}
                </span>
                <span className="group-member-goal">
                  {period === 'today' ? <b>{formatWorkoutSeconds(member.todaySeconds)}</b> : <b>주간 목표 {member.weeklyGoalPercent}%</b>}
                  {member.isActive && <small>🔥 운동 중</small>}
                </span>
              </button>
              {canRemoveMembers && !member.isOwner && onRemoveMember && <button type="button" className="group-remove-btn" onClick={() => onRemoveMember(member)}>내보내기</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
