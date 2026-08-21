import { useEffect, useState } from 'react';
import { leaveGroup, loadGroupDetail, removeGroupMember } from '../../group/groupApi';
import type { GroupDetail, GroupMemberSummary } from '../../group/groupTypes';
import { formatWorkoutSeconds } from '../../group/groupSelectors';
import { GroupMemberDetailModal } from './GroupMemberDetailModal';
import { GroupCoopQuestPanel } from './GroupCoopQuestPanel';
import { GroupTeamStreakPanel } from './GroupTeamStreakPanel';
import { GroupWeeklyAwardsPanel } from './GroupWeeklyAwardsPanel';
import { GroupMotivationPanel } from './GroupMotivationPanel';
import { useGroupAuth } from '../../group/GroupAuthContext';

export function GroupDetailScreen({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { user } = useGroupAuth();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [selected, setSelected] = useState<GroupMemberSummary | null>(null);
  const [message, setMessage] = useState('');

  async function refresh() {
    try { setDetail(await loadGroupDetail(groupId)); setMessage(''); }
    catch { setMessage('그룹 정보를 불러오지 못했습니다.'); }
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 60_000); return () => window.clearInterval(timer); }, [groupId]);

  async function leave() {
    if (!window.confirm('이 그룹에서 나갈까요?')) return;
    try { await leaveGroup(groupId); onBack(); }
    catch (error) { setMessage(error instanceof Error && error.message === 'OWNER_CANNOT_LEAVE' ? '그룹장은 다른 멤버가 있을 때 탈퇴할 수 없습니다.' : '그룹에서 나가지 못했습니다.'); }
  }

  async function remove(member: GroupMemberSummary) {
    if (!window.confirm(`${member.nickname}님을 그룹에서 내보낼까요?`)) return;
    try { await removeGroupMember(groupId, member.userId); await refresh(); }
    catch { setMessage('멤버를 내보내지 못했습니다.'); }
  }

  if (!detail) return <div className="group-detail"><button className="group-back" type="button" onClick={onBack}>‹ 내 그룹</button><p className="group-empty">{message || '불러오는 중…'}</p></div>;
  const mine = user?.id === detail.ownerId;
  const activeCount = detail.members.filter((member) => member.isActive).length;

  return <div className="group-detail">
    <button className="group-back" type="button" onClick={onBack}>‹ 내 그룹</button>
    <section className="group-detail-hero">
      <div><span>WORKOUT GROUP</span><h2>{detail.name}</h2><p>{detail.memberCount}명 · 🔥 지금 {activeCount}명 운동 중 · 이번 주 총 {formatWorkoutSeconds(detail.weeklySeconds)}</p></div>
      {detail.inviteCode && <div className="group-invite-code"><span>초대코드</span><strong>{detail.inviteCode}</strong></div>}
    </section>
    {message && <p className="group-error">{message}</p>}
    <GroupCoopQuestPanel members={detail.members} />
    <GroupTeamStreakPanel
      memberCount={detail.memberCount}
      dailyParticipation={detail.dailyParticipation}
      members={detail.members}
      currentUserId={user?.id}
      onSelectMember={setSelected}
    />
    <GroupWeeklyAwardsPanel members={detail.members} />
    <GroupMotivationPanel
      members={detail.members}
      currentUserId={user?.id}
      onSelectMember={setSelected}
      onRemoveMember={(member) => void remove(member)}
      canRemoveMembers={mine}
    />
    <button type="button" className="group-danger-btn" onClick={leave}>{mine ? '그룹 삭제/나가기' : '그룹 나가기'}</button>
    {selected && <GroupMemberDetailModal
      member={selected}
      groupId={detail.id}
      currentUserId={user?.id}
      onClose={() => setSelected(null)}
    />}
  </div>;
}
