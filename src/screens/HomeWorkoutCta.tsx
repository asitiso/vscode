interface HomeWorkoutCtaProps {
  status: 'idle' | 'running';
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onNavigate: () => void;
}

export function HomeWorkoutCta({ status, onStart, onStop, onNavigate }: HomeWorkoutCtaProps) {
  const running = status === 'running';

  const handleClick = async () => {
    if (running) await onStop();
    else await onStart();
    onNavigate();
  };

  return (
    <button
      type="button"
      className={`home-screen__layer home-screen__cta ${running ? 'home-screen__cta--running' : ''}`}
      aria-label={running ? '운동 종료하기' : '오늘 운동 시작'}
      onClick={() => { void handleClick(); }}
    >
      <span className="home-screen__cta-icon" aria-hidden="true">{running ? '⏹' : '💪'}</span>
      <span>{running ? '운동 종료하기' : '오늘 운동 시작'}</span>
    </button>
  );
}
