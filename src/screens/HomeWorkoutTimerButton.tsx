interface HomeWorkoutTimerButtonProps {
  status: 'idle' | 'running';
  elapsedSeconds: number;
  onStart: () => void | Promise<void>;
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

export function HomeWorkoutTimerButton({ status, elapsedSeconds, onStart }: HomeWorkoutTimerButtonProps) {
  const running = status === 'running';
  const elapsedLabel = formatElapsed(elapsedSeconds);

  return (
    <button
      type="button"
      className={`home-screen__layer home-screen__workout-timer ${running ? 'home-screen__workout-timer--running' : ''}`}
      aria-label={running ? `운동 타이머 ${elapsedLabel} 진행 중` : '운동 타이머 시작'}
      aria-disabled={running || undefined}
      onClick={() => {
        if (!running) void onStart();
      }}
    >
      <span className="home-screen__workout-timer-icon" aria-hidden="true">⏱</span>
      {running && <span className="home-screen__workout-timer-time" aria-live="polite">{elapsedLabel}</span>}
    </button>
  );
}
