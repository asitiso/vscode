import { buildGroupTeamStreakView } from '../../group/groupTeamStreakSelectors';
import type { GroupDailyParticipation } from '../../group/groupTypes';
import './GroupTeamStreakPanel.css';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function GroupTeamStreakPanel({ memberCount, dailyParticipation }: { memberCount: number; dailyParticipation: GroupDailyParticipation[] }) {
  if (memberCount <= 0) return null;
  const today = localDateKey();
  const view = buildGroupTeamStreakView({ memberCount, dailyParticipation, today });

  return (
    <section className="group-team-streak" aria-labelledby="group-team-streak-title">
      <div className="group-team-streak__heading">
        <div><span>TEAM STREAK</span><h3 id="group-team-streak-title">🔥 팀 스트릭</h3></div>
        <strong>{view.streakDays > 0 ? `${view.streakDays}일 연속` : '스트릭 준비 중'}</strong>
      </div>
      <p className="group-team-streak__target">하루 {view.target}명 참여 시 성공</p>
      <div className="group-team-streak__days" aria-label="이번 주 팀 출석">
        {view.days.map((day) => (
          <div key={day.date} className={`group-team-streak__day ${day.completed ? 'is-complete' : ''} ${day.isFuture ? 'is-future' : ''} ${day.date === today ? 'is-today' : ''}`}>
            <span>{day.label}</span><b>{day.participantCount}/{memberCount}</b><small aria-hidden="true">{day.completed ? '✓' : day.isFuture ? '·' : ' '}</small>
          </div>
        ))}
      </div>
      <p className={`group-team-streak__status ${view.todayCompleted ? 'is-complete' : ''}`}>
        {view.todayCompleted ? '오늘도 팀 스트릭 성공!' : `오늘 ${view.todayNeeded}명 더 운동하면 스트릭 유지!`}
      </p>
    </section>
  );
}
