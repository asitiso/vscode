import { useEffect, useState } from 'react';
import { loadGroupDailyCheerSummary, sendGroupDailyCheer } from '../../group/groupApi';
import { formatWorkoutSeconds } from '../../group/groupSelectors';
import type { GroupCheerSummary, GroupCheerType, GroupMemberSummary } from '../../group/groupTypes';

const CHEER_OPTIONS: Array<{ type: GroupCheerType; label: string }> = [
  { type: 'fire', label: '🔥 불붙여!' },
  { type: 'clap', label: '👏 잘한다!' },
  { type: 'together', label: '💪 같이가자!' },
];

export function GroupMemberDetailModal({
  member,
  groupId,
  currentUserId,
  onClose,
}: {
  member: GroupMemberSummary;
  groupId: string;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [cheers, setCheers] = useState<GroupCheerSummary | null>(null);
  const [cheerLoading, setCheerLoading] = useState(true);
  const [cheerSending, setCheerSending] = useState(false);
  const [cheerError, setCheerError] = useState('');
  const canCheer = Boolean(currentUserId && currentUserId !== member.userId);

  useEffect(() => {
    let cancelled = false;
    void loadGroupDailyCheerSummary(groupId, member.userId)
      .then((summary) => {
        if (!cancelled) setCheers(summary);
      })
      .catch(() => {
        if (!cancelled) setCheerError('응원 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setCheerLoading(false);
      });
    return () => { cancelled = true; };
  }, [groupId, member.userId]);

  async function sendCheer(type: GroupCheerType) {
    if (!canCheer || cheerSending) return;
    setCheerSending(true);
    setCheerError('');
    try {
      setCheers(await sendGroupDailyCheer(groupId, member.userId, type));
    } catch {
      setCheerError('응원을 보내지 못했습니다.');
    } finally {
      setCheerSending(false);
    }
  }

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

      <div className="group-cheers">
        <div className="group-cheers__heading">
          <strong>오늘 받은 응원</strong>
          <small>보낸 사람은 표시되지 않아요</small>
        </div>
        {cheers ? (
          <div className="group-cheer-counts" aria-label="오늘 받은 응원 집계">
            <span>🔥 {cheers.fire}</span>
            <span>👏 {cheers.clap}</span>
            <span>💪 {cheers.together}</span>
          </div>
        ) : (
          <p className="group-cheers__status">{cheerLoading ? '응원 불러오는 중…' : '아직 표시할 응원이 없어요'}</p>
        )}

        {canCheer && cheers && <>
          <strong className="group-cheers__send-label">응원 보내기</strong>
          <div className="group-cheer-actions">
            {CHEER_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                aria-pressed={cheers.mySelection === option.type}
                disabled={cheerSending}
                onClick={() => void sendCheer(option.type)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>}
        {cheerError && <p className="group-cheers__error">{cheerError}</p>}
      </div>
    </section>
  </div>;
}
