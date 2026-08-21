import type { GroupMemberSummary } from '../../group/groupTypes';
import { buildGroupQuestView, type GroupQuestProgress } from '../../group/groupQuestSelectors';

function QuestRow({
  title,
  progress,
  unit,
}: {
  title: string;
  progress: GroupQuestProgress;
  unit: '명' | '분';
}) {
  return (
    <div className={`group-quest-row ${progress.completed ? 'is-complete' : ''}`}>
      <div className="group-quest-row__copy">
        <strong>{title}</strong>
        <span>{progress.current} / {progress.target}{unit}</span>
      </div>
      <div className="group-quest-progress" aria-label={`${title} 진행률 ${Math.round(progress.progressPercent)}%`}>
        <i style={{ width: `${progress.progressPercent}%` }} />
      </div>
    </div>
  );
}

export function GroupCoopQuestPanel({ members }: { members: GroupMemberSummary[] }) {
  const view = buildGroupQuestView(members);
  const completedCount = [view.attendance, view.time, view.goal].filter((quest) => quest.completed).length;

  return (
    <section className={`group-quest-panel ${view.allCompleted ? 'is-complete' : ''}`} aria-labelledby="group-quest-title">
      <div className="group-quest-panel__heading">
        <div>
          <span>WEEKLY CO-OP</span>
          <h3 id="group-quest-title">
            {view.allCompleted ? '🏆 이번 주 우리 그룹 미션 COMPLETE!' : '이번 주 공동 퀘스트'}
          </h3>
        </div>
        <b>{completedCount}/3</b>
      </div>

      <div className="group-quest-list">
        <QuestRow title="👟 모두의 출석" progress={view.attendance} unit="명" />
        <QuestRow title="⏱️ 함께 채운 시간" progress={view.time} unit="분" />
        <QuestRow title="🎯 각자의 목표, 하나의 팀" progress={view.goal} unit="명" />
      </div>

      <div className="group-quest-mvp">
        <span>🔥 이번 주 MVP</span>
        {view.mvp ? (
          <div>
            <strong>{view.mvp.member.nickname}</strong>
            <b>기여도 {view.mvp.score}점</b>
          </div>
        ) : (
          <p>이번 주 첫 기여자를 기다리고 있어요</p>
        )}
      </div>
    </section>
  );
}
