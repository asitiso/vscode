import type { WorkoutCompletionSummary } from '../game/workoutCompletionSummary';
import './WorkoutCompletionFeedback.css';

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

export function WorkoutCompletionFeedback({
  summary,
  onDone,
}: {
  summary: WorkoutCompletionSummary;
  onDone: () => void;
}) {
  const weeklyMessage = summary.weeklyGoalCompletedNow
    ? '이번 주 목표 달성! 보너스 XP까지 획득했어요.'
    : summary.weeklyRemaining > 0
      ? `이번 주 목표까지 ${summary.weeklyRemaining}회 남았어요`
      : '이번 주 목표를 이미 달성했어요.';

  return (
    <div className="workout-completion" role="presentation">
      <section
        className="workout-completion__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-completion-title"
      >
        <div className="workout-completion__celebration" aria-hidden="true">🎉</div>
        <span className="workout-completion__kicker">WORKOUT COMPLETE</span>
        <h2 id="workout-completion-title">오늘 운동 완료!</h2>
        {summary.durationSeconds > 0 && (
          <div className="workout-completion__duration">
            <span aria-hidden="true">⏱</span>
            <strong>{formatDuration(summary.durationSeconds)}</strong>
          </div>
        )}

        <div className="workout-completion__rewards">
          <div><span aria-hidden="true">⚡</span><strong>+{summary.xpGain} XP</strong><small>경험치</small></div>
          <div><span aria-hidden="true">🔥</span><strong>{summary.weeklySessions} / {summary.weeklyGoalTarget}회</strong><small>이번 주</small></div>
          <div><span aria-hidden="true">🎁</span><strong>카드팩 +{summary.packCount}</strong><small>운동 보상</small></div>
        </div>

        <p className={summary.weeklyGoalCompletedNow ? 'workout-completion__message workout-completion__message--complete' : 'workout-completion__message'}>
          {weeklyMessage}
        </p>
        <button type="button" className="workout-completion__done" onClick={onDone}>홈으로</button>
      </section>
    </div>
  );
}
