import './HomeWeeklyGoalControl.css';

interface HomeWeeklyGoalControlProps {
  open: boolean;
  sessionsThisWeek: number;
  goalTarget: number;
  remainingThisWeek: number;
  streak: number;
  onToggle: () => void;
}

export function HomeWeeklyGoalControl({
  open,
  sessionsThisWeek,
  goalTarget,
  remainingThisWeek,
  streak,
  onToggle,
}: HomeWeeklyGoalControlProps) {
  const safeTarget = Math.max(1, goalTarget);
  const progressPercent = Math.min(100, Math.round((sessionsThisWeek / safeTarget) * 100));

  return (
    <>
      <button
        type="button"
        className="hud-badge hud-badge--streak hud-badge--weekly"
        aria-expanded={open}
        aria-controls="home-weekly-goal-popover"
        aria-label="주간 운동 상세 보기"
        onClick={onToggle}
      >
        <span className="hud-badge__icon" aria-hidden="true">🔥</span>
        <span className="hud-badge__text">
          <span className="hud-badge__title">{streak}주 연속</span>
          <span className="hud-badge__subtitle">이번 주 {sessionsThisWeek}/{goalTarget}회</span>
        </span>
      </button>

      {open && (
        <section
          id="home-weekly-goal-popover"
          className="home-hud-popover home-hud-popover--right weekly-goal-popover"
          role="dialog"
          aria-labelledby="home-weekly-goal-title"
        >
          <div className="weekly-goal-popover__heading">
            <span className="weekly-goal-popover__icon" aria-hidden="true">🔥</span>
            <div>
              <strong id="home-weekly-goal-title">이번 주 운동</strong>
              <span>주간 목표 진행도</span>
            </div>
            <b>{progressPercent}%</b>
          </div>

          <div className="weekly-goal-popover__numbers">
            <span>이번 주 운동</span>
            <strong>{sessionsThisWeek} / {goalTarget}회</strong>
          </div>

          <div
            className="weekly-goal-progress"
            role="progressbar"
            aria-label="이번 주 운동 목표 진행률"
            aria-valuemin={0}
            aria-valuemax={safeTarget}
            aria-valuenow={Math.min(sessionsThisWeek, safeTarget)}
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          <p className={remainingThisWeek > 0 ? 'weekly-goal-popover__remaining' : 'weekly-goal-popover__remaining weekly-goal-popover__remaining--complete'}>
            {remainingThisWeek > 0 ? `이번 주 목표까지 ${remainingThisWeek}회 남았어요` : '이번 주 목표 달성! 🎉'}
          </p>
          <p className="weekly-goal-popover__streak">현재 {streak}주 연속 달성 중</p>
        </section>
      )}
    </>
  );
}
