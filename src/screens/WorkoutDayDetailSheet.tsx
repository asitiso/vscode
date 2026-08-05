import { useEffect } from 'react';
import type { DailyWorkoutReport } from '../game/workoutReport';
import type { FeelingTag } from '../types';
import './WorkoutDayDetailSheet.css';

const FEELING_LABELS: Record<FeelingTag, string> = {
  easy: '가볍게 완료했어요',
  moderate: '적당히 힘들었어요',
  hard: '정말 힘들었어요',
  'personal-best': '개인 기록을 경신했어요',
  'good-condition': '컨디션이 좋았어요',
  'bad-condition': '컨디션이 좋지 않았어요',
  'completed-anyway': '그래도 운동을 완료했어요',
};

function formatDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}월 ${day}일 운동 기록`;
}

function formatExerciseMetrics(durationMinutes: number, sets: number, reps: number): string {
  const values: string[] = [];
  if (durationMinutes > 0) values.push(`${durationMinutes}분`);
  if (sets > 0) values.push(`${sets}세트`);
  if (reps > 0) values.push(`${reps}회`);
  return values.length > 0 ? values.join(' · ') : '기록 완료';
}

export function WorkoutDayDetailSheet({
  report,
  onClose,
}: {
  report: DailyWorkoutReport | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!report) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [report, onClose]);

  if (!report) return null;

  return (
    <div className="workout-day-sheet" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="workout-day-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="workout-day-title">
        <div className="workout-day-sheet__handle" />
        <header className="workout-day-sheet__header">
          <div>
            <span>DAILY LOG</span>
            <h2 id="workout-day-title">{formatDate(report.date)}</h2>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        <div className="workout-day-sheet__summary">
          <div><strong>{report.totals.exerciseCount}</strong><span>운동 종목</span></div>
          <div><strong>{report.totals.durationMinutes}</strong><span>총 시간(분)</span></div>
          <div><strong>{report.totals.sets}</strong><span>총 세트</span></div>
          <div><strong>{report.totals.reps}</strong><span>총 반복</span></div>
        </div>

        {report.exercises.length > 0 ? (
          <div className="workout-day-sheet__exercises">
            {report.exercises.map((exercise) => (
              <article key={exercise.exerciseId}>
                <div>
                  <strong>{exercise.name}</strong>
                  <span>{formatExerciseMetrics(exercise.durationMinutes, exercise.sets, exercise.reps)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="workout-day-sheet__empty">이 날짜에는 운동 기록이 없어요.</p>
        )}

        {report.logs.length > 0 && (
          <div className="workout-day-sheet__notes">
            {report.logs.map((log, index) => (
              <div key={log.id}>
                <strong>{report.logs.length > 1 ? `${index + 1}번째 기록` : '운동 느낌'}</strong>
                <span>{FEELING_LABELS[log.feeling]}</span>
                {log.memo && <p>{log.memo}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
