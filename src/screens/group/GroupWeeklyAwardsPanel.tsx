import { buildGroupAwardsView } from '../../group/groupAwardsSelectors';
import { formatWorkoutSeconds } from '../../group/groupSelectors';
import type { GroupMemberSummary } from '../../group/groupTypes';

interface AwardCardProps {
  title: string;
  nickname: string;
  detail: string;
}

function AwardCard({ title, nickname, detail }: AwardCardProps) {
  return (
    <div className="group-award-card">
      <span>{title}</span>
      <strong>{nickname}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function GroupWeeklyAwardsPanel({ members }: { members: GroupMemberSummary[] }) {
  const view = buildGroupAwardsView(members);
  if (!view.todayFlame && !view.goalHunter && !view.hiddenHero) return null;

  return (
    <section className="group-awards-panel" aria-labelledby="group-awards-title">
      <div className="group-awards-panel__heading">
        <span>WEEKLY AWARDS</span>
        <h3 id="group-awards-title">🏅 이번 주 팀 시상식</h3>
      </div>
      <div className="group-awards-grid">
        {view.todayFlame && (
          <AwardCard
            title="🔥 오늘의 불꽃"
            nickname={view.todayFlame.member.nickname}
            detail={`오늘 ${formatWorkoutSeconds(view.todayFlame.todaySeconds)}`}
          />
        )}
        {view.goalHunter && (
          <AwardCard
            title="🎯 목표 사냥꾼"
            nickname={view.goalHunter.member.nickname}
            detail={`목표 ${Math.round(view.goalHunter.weeklyGoalPercent)}%`}
          />
        )}
        {view.hiddenHero && (
          <AwardCard
            title="🤝 숨은 영웅"
            nickname={view.hiddenHero.member.nickname}
            detail={`기여도 ${view.hiddenHero.score}점`}
          />
        )}
      </div>
    </section>
  );
}
