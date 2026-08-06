import { useMemo, useState } from 'react';
import type { ExercisePerformanceRecord } from '../game/exerciseAnalysis';
import type { DailyWorkoutReport } from '../game/workoutReport';
import { buildDailyReport } from '../game/workoutReport';
import type { WorkoutLog } from '../types';

const PAGE_SIZE = 20;

function metricText(record: ExercisePerformanceRecord): string {
  const parts: string[] = [];
  if (record.weightKg > 0) parts.push(`${record.weightKg}kg`);
  if (record.durationMinutes > 0) parts.push(`${record.durationMinutes}분`);
  if (record.sets > 0) parts.push(`${record.sets}세트`);
  if (record.totalReps > 0) parts.push(`${record.totalReps}회`);
  return parts.length ? parts.join(' · ') : '운동 완료';
}

export function ExerciseHistoryList({
  records,
  workoutLogs,
  onSelectDay,
}: {
  records: ExercisePerformanceRecord[];
  workoutLogs: WorkoutLog[];
  onSelectDay: (report: DailyWorkoutReport) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = records.slice(0, visibleCount);
  const dailyReports = useMemo(() => new Map(records.map((record) => [record.date, buildDailyReport(workoutLogs, record.date)])), [records, workoutLogs]);

  return (
    <section className="exercise-history">
      <div className="exercise-section-heading">
        <strong>전체 기록</strong>
        <span>최신순 {records.length}회</span>
      </div>
      <div className="exercise-history__list">
        {visible.map((record) => (
          <button key={record.id} type="button" onClick={() => {
            const report = dailyReports.get(record.date);
            if (report) onSelectDay(report);
          }}>
            <div><strong>{record.date}</strong><span>{metricText(record)}</span></div>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      {visibleCount < records.length && (
        <button className="exercise-history__more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>20개 더 보기</button>
      )}
    </section>
  );
}
