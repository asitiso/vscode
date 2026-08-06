import { useMemo, useState } from 'react';
import { buildExerciseAnalysis, type ExercisePerformanceRecord } from '../game/exerciseAnalysis';
import type { DailyWorkoutReport } from '../game/workoutReport';
import type { FeelingTag, WorkoutLog } from '../types';
import { ExerciseHistoryList } from './ExerciseHistoryList';
import { ExerciseTrendChart } from './ExerciseTrendChart';
import { WorkoutDayDetailSheet } from './WorkoutDayDetailSheet';
import './ExerciseAnalysisScreen.css';

const FEELING_LABELS: Record<FeelingTag, string> = {
  easy: '가볍게', moderate: '적당히', hard: '힘들게', 'personal-best': '개인 기록',
  'good-condition': '좋은 컨디션', 'bad-condition': '아쉬운 컨디션', 'completed-anyway': '끝까지 완료',
};

function recordMetrics(record: ExercisePerformanceRecord): string {
  const parts: string[] = [];
  if (record.weightKg > 0) parts.push(`${record.weightKg}kg`);
  if (record.durationMinutes > 0) parts.push(`${record.durationMinutes}분`);
  if (record.sets > 0) parts.push(`${record.sets}세트`);
  if (record.totalReps > 0) parts.push(`${record.totalReps}회`);
  return parts.length ? parts.join(' · ') : '운동 완료';
}

export function ExerciseAnalysisScreen({ exerciseId, workoutLogs, onBack }: { exerciseId: string; workoutLogs: WorkoutLog[]; onBack: () => void }) {
  const analysis = useMemo(() => buildExerciseAnalysis(workoutLogs, exerciseId), [workoutLogs, exerciseId]);
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DailyWorkoutReport | null>(null);

  if (!analysis) return <div className="exercise-analysis-screen exercise-analysis-screen--empty"><button type="button" className="exercise-analysis__back" onClick={onBack}>← 운동 리포트</button><div><span>📊</span><strong>아직 분석할 기록이 없어요</strong><p>운동을 기록하면 상세 분석이 표시됩니다.</p></div></div>;

  const bests = [
    analysis.personalBests.maxWeightKg ? { label: '최고 중량', value: analysis.personalBests.maxWeightKg, unit: 'kg' } : null,
    analysis.personalBests.maxDurationMinutes ? { label: '최장 시간', value: analysis.personalBests.maxDurationMinutes, unit: '분' } : null,
    analysis.personalBests.maxReps ? { label: '최다 반복', value: analysis.personalBests.maxReps, unit: '회' } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return <div className="exercise-analysis-screen">
    <header className="exercise-analysis__header"><button type="button" className="exercise-analysis__back" onClick={onBack}>← 운동 리포트</button><span>EXERCISE ANALYSIS</span><h1>{analysis.exerciseName}</h1><p>최근 운동일 {analysis.latestDate}</p></header>
    {bests.length > 0 && <section className="exercise-best-grid">{bests.map((best) => <div key={best.label}><span>{best.label}</span><strong>{best.value}<small>{best.unit}</small></strong></div>)}</section>}
    <section className="exercise-analysis__section"><div className="exercise-section-heading"><strong>누적 통계</strong><span>전체 기록 기준</span></div><div className="exercise-total-grid"><div><strong>{analysis.totals.activeDays}</strong><span>운동일</span></div><div><strong>{analysis.totals.recordCount}</strong><span>기록 횟수</span></div><div><strong>{analysis.totals.sets}</strong><span>총 세트</span></div><div><strong>{analysis.totals.reps}</strong><span>총 반복</span></div><div><strong>{analysis.totals.durationMinutes}</strong><span>총 시간(분)</span></div></div></section>
    <ExerciseTrendChart metric={analysis.trend.metric} points={analysis.trend.points} />
    <section className="exercise-analysis__section"><div className="exercise-section-heading"><strong>최근 기록</strong><span>최근 4회</span></div><div className="exercise-recent-list">{analysis.recentRecords.map((record) => <article key={record.id}><div><strong>{record.date}</strong><span>{FEELING_LABELS[record.feeling]}</span></div><p>{recordMetrics(record)}</p>{record.note && <small>{record.note}</small>}</article>)}</div>{!showAll && <button className="exercise-analysis__all" type="button" onClick={() => setShowAll(true)}>전체 기록 보기</button>}</section>
    {showAll && <ExerciseHistoryList records={analysis.history} workoutLogs={workoutLogs} onSelectDay={setSelectedDay} />}
    <WorkoutDayDetailSheet report={selectedDay} onClose={() => setSelectedDay(null)} />
  </div>;
}
