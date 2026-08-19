interface HomeWorkoutCtaProps {
  status: 'idle' | 'running';
  elapsedSeconds: number;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<unknown>;
  onNavigate: () => void;
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

export function HomeWorkoutCta({ status, elapsedSeconds, onStart, onStop, onNavigate }: HomeWorkoutCtaProps) {
  const running = status === 'running';
  const elapsedLabel = formatElapsed(elapsedSeconds);

  const handleClick = async () => {
    if (running) await onStop();
    else await onStart();
    onNavigate();
  };

  return (
    <button
      type="button"
      className={`home-screen__layer home-screen__cta ${running ? 'home-screen__cta--running' : ''}`}
      aria-label={running ? `운동 종료하기 · ${elapsedLabel}` : '오늘 운동 시작'}
      onClick={() => { void handleClick(); }}
    >
      <span className="home-screen__cta-icon" aria-hidden="true">{running ? '⏹' : '💪'}</span>
      <span>{running ? '운동 종료하기' : '오늘 운동 시작'}</span>
      {running && <span className="home-screen__cta-time" aria-hidden="true">{elapsedLabel}</span>}
    </button>
  );
}
