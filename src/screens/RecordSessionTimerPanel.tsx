interface RecordSessionTimerPanelProps {
  status: 'idle' | 'running';
  elapsedSeconds: number;
  lastCompletedSeconds: number;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<unknown>;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function RecordSessionTimerPanel({
  status,
  elapsedSeconds,
  lastCompletedSeconds,
  onStart,
  onStop,
}: RecordSessionTimerPanelProps) {
  if (status === 'running') {
    return (
      <section className="record-session-timer record-session-timer--active">
        <div>
          <span className="record-session-timer__label">운동 중 🔥</span>
          <strong>{formatTimer(elapsedSeconds)}</strong>
          <small>홈과 기록 화면에서 같은 운동 시간이 이어집니다.</small>
        </div>
        <button type="button" aria-label="운동 종료" onClick={() => { void onStop(); }}>종료</button>
      </section>
    );
  }

  if (lastCompletedSeconds > 0) {
    return (
      <section className="record-session-timer record-session-timer--complete">
        <div>
          <span className="record-session-timer__label">운동 세션 완료</span>
          <strong>오늘 운동 {formatTimer(lastCompletedSeconds)} 완료</strong>
          <small>이 시간을 오늘 운동 기록과 함께 저장할 수 있어요.</small>
        </div>
        <button type="button" aria-label="다시 운동 시작" onClick={() => { void onStart(); }}>다시 시작</button>
      </section>
    );
  }

  return (
    <section className="record-session-timer">
      <div>
        <span className="record-session-timer__label">운동 세션 타이머</span>
        <strong>운동을 시작할 준비가 됐나요?</strong>
        <small>로그인하지 않아도 타이머는 사용할 수 있어요.</small>
      </div>
      <button type="button" aria-label="운동 시작" onClick={() => { void onStart(); }}>▶ 운동 시작</button>
    </section>
  );
}
