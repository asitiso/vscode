import { useMemo, useState } from 'react';
import type { WorkoutLog } from '../types';
import { buildDailyReport, type DailyWorkoutReport } from '../game/workoutReport';
import { buildWorkoutLogHistoryItem } from '../game/workoutHistorySummary';
import './WorkoutHistoryList.css';

const PAGE_SIZE = 20;

function formatDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}월 ${day}일`;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${secs}초`;
  return `${secs}초`;
}

function formatMetrics(totalSets: number, totalReps: number, packCount: number): string {
  const parts: string[] = [];
  if (totalSets > 0) parts.push(`${totalSets}세트`);
  if (totalReps > 0) parts.push(`${totalReps}회`);
  if (packCount > 0) parts.push(`카드팩 ${packCount}개`);
  return parts.length ? parts.join(' · ') : '운동 기록 완료';
}

function personalBestCount(log: WorkoutLog): number {
  if (log.personalBestExerciseIds !== undefined) return log.personalBestExerciseIds.length;
  return log.feeling === 'personal-best' ? 1 : 0;
}

export function WorkoutHistoryList({
  workoutLogs,
  onSelectDay,
}: {
  workoutLogs: WorkoutLog[];
  onSelectDay: (report: DailyWorkoutReport) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sortedLogs = useMemo(
    () => [...workoutLogs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [workoutLogs],
  );
  const visible = sortedLogs.slice(0, visibleCount);

  return (
    <section className="workout-history-list">
      <div className="report-section__heading workout-history-list__heading">
        <strong>최근 운동 기록</strong>
        <span>최신순 {workoutLogs.length}회</span>
      </div>

      {visible.length > 0 ? (
        <div className="workout-history-list__items">
          {visible.map((log) => {
            const item = buildWorkoutLogHistoryItem(log);
            const recordCount = personalBestCount(log);
            return (
              <button
                key={item.id}
                type="button"
                className="workout-history-card"
                aria-label={`${formatDate(item.date)} 운동 기록 자세히 보기`}
                onClick={() => onSelectDay(buildDailyReport(workoutLogs, item.date))}
              >
                <span className="workout-history-card__top">
                  <strong>{formatDate(item.date)}</strong>
                  <b>⏱ {formatDuration(item.durationSeconds)}</b>
                </span>
                <span className="workout-history-card__exercises">{item.exerciseNames.join(' · ') || '운동 기록'}</span>
                <span className="workout-history-card__bottom">
                  <small>{formatMetrics(item.totalSets, item.totalReps, item.packCount)}</small>
                  {recordCount > 0 && (
                    <span className="workout-history-card__record">
                      {recordCount > 1 ? `🏆 신기록 ${recordCount}개` : '🏆 NEW RECORD'}
                    </span>
                  )}
                  <i aria-hidden="true">›</i>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="report-empty-inline">아직 저장된 운동 기록이 없어요.</p>
      )}

      {visibleCount < sortedLogs.length && (
        <button
          type="button"
          className="workout-history-list__more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          20개 더 보기
        </button>
      )}
    </section>
  );
}
