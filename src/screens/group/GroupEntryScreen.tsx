import { useEffect, useState } from 'react';
import { useGroupAuth } from '../../group/GroupAuthContext';
import { loadGroupProfile, updateGroupWeeklyGoalProgress } from '../../group/groupApi';
import type { GroupProfile } from '../../group/groupTypes';
import { useGame } from '../../store/GameContext';
import { GroupAuthScreen } from './GroupAuthScreen';
import { GroupProfileSetup } from './GroupProfileSetup';
import { GroupListScreen } from './GroupListScreen';
import { GroupDetailScreen } from './GroupDetailScreen';
import './GroupScreens.css';

export function GroupEntryScreen({ onBack }: { onBack: () => void }) {
  const { user, loading: authLoading, signOut } = useGroupAuth();
  const { state, weeklyProgress } = useGame();
  const [profile, setProfile] = useState<GroupProfile | null | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let alive = true;
    loadGroupProfile().then((value) => { if (alive) setProfile(value); }).catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !profile) return;
    const target = Math.max(1, state.user.weeklyGoal.targetSessionsPerWeek);
    const percent = Math.min(100, Math.round((weeklyProgress.sessionsThisWeek / target) * 100));
    void updateGroupWeeklyGoalProgress(percent).catch(() => undefined);
  }, [user?.id, profile?.userId, state.user.weeklyGoal.targetSessionsPerWeek, weeklyProgress.sessionsThisWeek]);

  if (authLoading || (user && profile === undefined)) return <div className="group-screen"><div className="group-empty">그룹 정보를 준비하는 중…</div></div>;

  return <div className="group-screen">
    <header className="group-screen-header">
      <button type="button" className="group-back" onClick={onBack}>‹ 설정</button>
      <div><span>TOGETHER</span><h1>운동 그룹</h1><p>친구들과 오늘의 운동 흐름을 가볍게 공유해요.</p></div>
      {user && <button type="button" className="group-signout" onClick={() => signOut()}>로그아웃</button>}
    </header>

    {!user ? <GroupAuthScreen /> : !profile ? <GroupProfileSetup initialNickname={state.user.name} onSaved={setProfile} /> : selectedGroupId ? <GroupDetailScreen groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} /> : <GroupListScreen onSelectGroup={setSelectedGroupId} />}
  </div>;
}
