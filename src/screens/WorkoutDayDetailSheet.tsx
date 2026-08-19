import { useEffect } from 'react';
import type { DailyWorkoutReport } from '../game/workoutReport';
import { buildWorkoutLogHistoryItem } from '../game/workoutHistorySummary';
import type { FeelingTag } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import './WorkoutDayDetailSheet.css';

const FEELING_LABELS: Record<FeelingTag, string> = {
  easy: '가볍게 완료했어요', moderate: '적당히 힘들었어요', hard: '정말 힘들었어요',
  'personal-best': '개인 기록을 경신했어요', 'good-condition': '컨디션이 좋았어요',
  'bad-condition': '컨디션이 좋지 않았어요', 'completed-anyway': '그래도 운동을 완료했어요',
};

function formatDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}월 ${day}일 운동 기록`;
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatCompactDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${secs}초`;
  return `${secs}초`;
}

function formatExerciseMetrics(durationMinutes: number, sets: number, reps: number): string {
  const values: string[] = [];
  if (durationMinutes > 0) values.push(`${durationMinutes}분`);
  if (sets > 0) values.push(`${sets}세트`);
  if (reps > 0) values.push(`${reps}회`);
  return values.length > 0 ? values.join(' · ') : '기록 완료';
}

function formatSessionMetrics(totalSets: number, totalReps: number, packCount: number): string {
  const values: string[] = [];
  if (totalSets > 0) values.push(`${totalSets}세트`);
  if (totalReps > 0) values.push(`${totalReps}회`);
  if (packCount > 0) values.push(`카드팩 ${packCount}개`);
  return values.length > 0 ? values.join(' · ') : '운동 기록 완료';
}

export function WorkoutDayDetailSheet({ report, onClose, onSelectExercise }: {
  report: DailyWorkoutReport | null;
  onClose: () => void;
  onSelectExercise?: (exerciseId: string) => void;
}) {
  useBodyScrollLock(Boolean(report));

  useEffect(() => {
    if (!report) return;
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [report, onClose]);

  if (!report) return null;

  const sessionItems = report.logs.map(buildWorkoutLogHistoryItem);
  const totalSessionSeconds = sessionItems.reduce((sum, item) => sum + item.durationSeconds, 0);

  return (
    <div className="workout-day-sheet" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="workout-day-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="workout-day-title">
        <div className="workout-day-sheet__handle" />
        <header className="workout-day-sheet__header">
          <div><span>DAILY LOG</span><h2 id="workout-day-title">{formatDate(report.date)}</h2></div>
          <button type="button" aria-label="닫기" onClick={onClose}>×</button>
        </header>
        <div className="workout-day-sheet__content">
          {totalSessionSeconds > 0 && (
            <div className="workout-day-sheet__duration-hero">
              <span>⏱ 오늘 총 운동시간</span>
              <strong>{formatClock(totalSessionSeconds)}</strong>
            </div>
          )}

          <div className="workout-day-sheet__summary">
            <div><strong>{report.totals.exerciseCount}</strong><span>운동 종목</span></div>
            <div><strong>{report.totals.logCount}</strong><span>운동 세션</span></div>
            <div><strong>{report.totals.sets}</strong><span>총 세트</span></div>
            <div><strong>{report.totals.reps}</strong><span>총 반복</span></div>
          </div>

          {sessionItems.length > 0 && (
            <div className="workout-day-sheet__sessions">
              <div className="workout-day-sheet__section-title"><strong>세션별 기록</strong><span>{sessionItems.length}회</span></div>
              {sessionItems.map((item, index) => (
                <article key={item.id}>
                  <div className="workout-day-sheet__session-top">
                    <strong>{index + 1}번째 운동</strong>
                    <b>{formatCompactDuration(item.durationSeconds)}</b>
                  </div>
                  <span className="workout-day-sheet__session-exercises">{item.exerciseNames.join(' · ') || '운동 기록'}</span>
                  <small>{formatSessionMetrics(item.totalSets, item.totalReps, item.packCount)}</small>
                </article>
              ))}
            </div>
          )}

          {report.exercises.length > 0 ? (
            <div className="workout-day-sheet__exercises">
              <div className="workout-day-sheet__section-title"><strong>종목별 기록</strong><span>{report.exercises.length}종</span></div>
              {report.exercises.map((exercise) => {
                const isPersonalBest = report.logs.some((log) => log.personalBestExerciseIds?.includes(exercise.exerciseId));
                return (
                  <article key={exercise.exerciseId}>
                    <button type="button" onClick={() => { onClose(); onSelectExercise?.(exercise.exerciseId); }} disabled={!onSelectExercise}>
                      <div>
                        <strong>{exercise.name}</strong>
                        {isPersonalBest && <small className="workout-day-sheet__record-badge"><span aria-hidden="true">🏆</span><b>NEW RECORD</b></small>}
                        <span>{formatExerciseMetrics(exercise.durationMinutes, exercise.sets, exercise.reps)}</span>
                      </div>
                      {onSelectExercise && <span aria-hidden="true">분석 ›</span>}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : <p className="workout-day-sheet__empty">이 날짜에는 운동 기록이 없어요.</p>}

          {report.logs.length > 0 && (
            <div className="workout-day-sheet__notes">
              <div className="workout-day-sheet__section-title"><strong>운동 느낌</strong><span>메모</span></div>
              {report.logs.map((log, index) => (
                <div key={log.id}><strong>{report.logs.length > 1 ? `${index + 1}번째 운동` : '오늘의 느낌'}</strong><span>{FEELING_LABELS[log.feeling]}</span>{log.memo && <p>{log.memo}</p>}</div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
