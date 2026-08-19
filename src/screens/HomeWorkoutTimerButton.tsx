interface HomeWorkoutTimerButtonProps {
  status: 'idle' | 'running';
  elapsedSeconds: number;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<unknown>;
}

function formatElapsed(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

export function HomeWorkoutTimerButton({ status, elapsedSeconds, onStart, onStop }: HomeWorkoutTimerButtonProps) {
  const running = status === 'running';
  const elapsedLabel = formatElapsed(elapsedSeconds);

  return (
    <button
      type="button"
      className={`hud-badge hud-badge--workout ${running ? 'hud-badge--workout-running' : ''}`}
      aria-label={running ? `운동 타이머 ${elapsedLabel} 종료` : '운동 타이머 시작'}
      onClick={() => {
        if (running) void onStop();
        else void onStart();
      }}
    >
      <span className="hud-badge__icon" aria-hidden="true">⏱</span>
      <span className="hud-badge__text">
        <span className="hud-badge__title">{running ? elapsedLabel : '운동'}</span>
        <span className="hud-badge__subtitle">{running ? '운동 중 · 탭해 종료' : '타이머 시작'}</span>
      </span>
    </button>
  );
}
