import type { GroupMemberSummary } from '../../group/groupTypes';
import { formatWorkoutSeconds } from '../../group/groupSelectors';

export function GroupMemberDetailModal({ member, onClose }: { member: GroupMemberSummary; onClose: () => void }) {
  return <div className="group-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="group-modal" role="dialog" aria-modal="true" aria-label={`${member.nickname} 운동 현황`}>
      <button type="button" className="group-modal-close" onClick={onClose} aria-label="닫기">×</button>
      <div className="group-member-avatar">{member.isActive ? '🔥' : '💪'}</div>
      <h2>{member.nickname}</h2>
      {member.isActive && <p className="group-live-label">지금 운동 중</p>}
      <div className="group-member-stats">
        <div><span>오늘 운동</span><strong>{formatWorkoutSeconds(member.todaySeconds)}</strong></div>
        <div><span>이번 주</span><strong>{formatWorkoutSeconds(member.weeklySeconds)}</strong></div>
        <div><span>주간 목표</span><strong>{member.weeklyGoalPercent}%</strong></div>
      </div>
      <p className="group-privacy-note">운동 종류·중량·세트 등 상세 기록은 그룹원에게 공개되지 않습니다.</p>
    </section>
  </div>;
}
