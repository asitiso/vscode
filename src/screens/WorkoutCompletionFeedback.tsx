import type { PersonalBestMetric } from '../game/personalBest';
import type { WorkoutCompletionSummary } from '../game/workoutCompletionSummary';
import './WorkoutCompletionFeedback.css';

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatPersonalBestValue(metric: PersonalBestMetric, value: number): string {
  if (metric === 'weight') return `${value}kg`;
  if (metric === 'duration') return `${value}분`;
  return `${value}회`;
}

export function WorkoutCompletionFeedback({
  summary,
  packId,
  onOpenPack,
  onDone,
}: {
  summary: WorkoutCompletionSummary;
  packId: string | null;
  onOpenPack: (packId: string) => void;
  onDone: () => void;
}) {
  const weeklyMessage = summary.weeklyGoalCompletedNow
    ? '이번 주 목표 달성! 보너스 XP와 특별팩을 획득했어요.'
    : summary.weeklyRemaining > 0
      ? `이번 주 목표까지 ${summary.weeklyRemaining}회 남았어요`
      : '이번 주 목표를 이미 달성했어요.';
  const primaryAction = summary.weeklyRewardPackCount > 0
    ? '🎁 주간 목표팩 지금 열기'
    : '🎁 카드팩 지금 열기';
  const personalBest = summary.personalBests[0];

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

        {personalBest && (
          <div className="workout-completion__weekly-reward">
            <span aria-hidden="true">🏆</span>
            <div>
              <small>NEW RECORD</small>
              <strong>{personalBest.exerciseName} {formatPersonalBestValue(personalBest.metric, personalBest.value)}</strong>
              <span>이전 최고 {formatPersonalBestValue(personalBest.metric, personalBest.previousValue)}</span>
              {summary.personalBestBonusXp > 0 && <em>신기록 보너스 +{summary.personalBestBonusXp} XP</em>}
              {summary.personalBests.length > 1 && <em>외 {summary.personalBests.length - 1}개 기록도 경신!</em>}
            </div>
          </div>
        )}

        <div className="workout-completion__rewards">
          <div><span aria-hidden="true">⚡</span><strong>+{summary.xpGain} XP</strong><small>경험치</small></div>
          <div><span aria-hidden="true">🔥</span><strong>{summary.weeklySessions} / {summary.weeklyGoalTarget}회</strong><small>이번 주</small></div>
          <div><span aria-hidden="true">🎁</span><strong>카드팩 +{summary.packCount}</strong><small>운동 보상</small></div>
        </div>

        {summary.weeklyRewardPackCount > 0 && (
          <div className="workout-completion__weekly-reward">
            <span aria-hidden="true">🔥</span>
            <div><small>WEEKLY REWARD</small><strong>주간 목표 달성팩 +1</strong></div>
          </div>
        )}

        <p className={summary.weeklyGoalCompletedNow ? 'workout-completion__message workout-completion__message--complete' : 'workout-completion__message'}>
          {weeklyMessage}
        </p>
        <div className="workout-completion__actions">
          <button
            type="button"
            className="workout-completion__open"
            disabled={!packId}
            onClick={() => { if (packId) onOpenPack(packId); }}
          >
            {packId ? primaryAction : '카드팩 준비 중'}
          </button>
          <button type="button" className="workout-completion__later" onClick={onDone}>나중에 열기</button>
        </div>
      </section>
    </div>
  );
}
