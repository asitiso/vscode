import { useMemo, useState } from 'react';
import type { WorkoutLog } from '../types';
import { buildMonthlyReport, buildWeeklyReport, getPreviousPeriodDelta, getWeekStart, shiftDateKey, type DailyWorkoutReport, type PeriodWorkoutReport, type ReportMetricTotals } from '../game/workoutReport';
import { buildRollingWorkoutSummary } from '../game/workoutHistorySummary';
import { getLocalDateKey } from '../game/cardSets';
import { WorkoutDayDetailSheet } from './WorkoutDayDetailSheet';
import { WorkoutHistoryList } from './WorkoutHistoryList';
import './WorkoutReportPanel.css';
import './PersonalBestInsights.css';

type ReportRange = 'weekly' | 'monthly';
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function parseDateKey(dateKey: string): Date { const [y, m, d] = dateKey.split('-').map(Number); return new Date(y, m - 1, d); }
function monthKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function formatPeriod(range: ReportRange, report: PeriodWorkoutReport): string {
  if (range === 'weekly') { const s = parseDateKey(report.startDate); const e = parseDateKey(report.endDate); return `${s.getMonth() + 1}.${s.getDate()} - ${e.getMonth() + 1}.${e.getDate()}`; }
  const date = parseDateKey(report.startDate); return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}
function formatDelta(value: number, unit: string): string { return value === 0 ? '이전 기간과 같음' : `이전 기간보다 ${value > 0 ? '+' : ''}${value}${unit}`; }
function formatRollingDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${secs}초`;
  return `${secs}초`;
}
function MetricCard({ label, value, unit, delta }: { label: string; value: number; unit: string; delta: number }) {
  return <div className="report-metric-card"><span>{label}</span><strong>{value.toLocaleString()}<small>{unit}</small></strong><em className={delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}>{formatDelta(delta, unit)}</em></div>;
}
function PersonalBestDayMarker({ day }: { day: DailyWorkoutReport }) {
  if (day.totals.personalBests <= 0) return null;
  return <span className="report-pr-day" aria-label={`${day.date} 신기록 ${day.totals.personalBests}개`} role="img">🏆</span>;
}
function WeeklyDays({ report, onSelect }: { report: PeriodWorkoutReport; onSelect: (day: DailyWorkoutReport) => void }) {
  return <section className="report-section"><div className="report-section__heading"><strong>요일별 운동 기록</strong><span>날짜를 눌러 자세히 보기</span></div><div className="report-week-list">{report.days.map((day, index) => <button key={day.date} type="button" onClick={() => onSelect(day)} className={day.totals.activeDays ? 'has-workout' : ''}><span className="report-week-list__day">{WEEKDAY_LABELS[index]}</span><span className="report-week-list__date">{Number(day.date.slice(-2))}일</span><PersonalBestDayMarker day={day} /><strong>{day.totals.activeDays ? `${day.totals.exerciseCount}종` : '-'}</strong><small>{day.totals.durationMinutes > 0 ? `${day.totals.durationMinutes}분` : `${day.totals.sets}세트`}</small></button>)}</div></section>;
}
function MonthlyCalendar({ report, onSelect }: { report: PeriodWorkoutReport; onSelect: (day: DailyWorkoutReport) => void }) {
  const firstDay = parseDateKey(report.startDate).getDay(); const offset = firstDay === 0 ? 6 : firstDay - 1;
  return <section className="report-section"><div className="report-section__heading"><strong>월간 운동 달력</strong><span>운동한 날짜를 눌러 자세히 보기</span></div><div className="report-calendar__weekdays">{WEEKDAY_LABELS.map((day) => <span key={day}>{day}</span>)}</div><div className="report-calendar">{Array.from({ length: offset }).map((_, i) => <span key={`empty-${i}`} className="report-calendar__empty" />)}{report.days.map((day) => <button key={day.date} type="button" onClick={() => onSelect(day)} className={day.totals.activeDays ? 'has-workout' : ''}><span>{Number(day.date.slice(-2))}</span><PersonalBestDayMarker day={day} />{day.totals.activeDays > 0 && <><div className="report-calendar__dots">{day.categories.slice(0, 3).map((category) => <i key={category.category} data-category={category.category} />)}</div><strong>{day.totals.exerciseCount}종</strong></>}</button>)}</div></section>;
}
function CategoryBars({ report }: { report: PeriodWorkoutReport }) {
  return <section className="report-section"><div className="report-section__heading"><strong>운동 카테고리</strong><span>운동 항목 수 기준</span></div>{report.categories.length > 0 ? <div className="report-category-bars">{report.categories.map((item) => <div key={item.category}><div><span>{item.label}</span><strong>{item.percentage}%</strong></div><span className="report-category-bars__track"><i style={{ width: `${item.percentage}%` }} /></span></div>)}</div> : <p className="report-empty-inline">이 기간에는 운동 기록이 없어요.</p>}</section>;
}

export function WorkoutReportPanel({ workoutLogs, onSelectExercise }: { workoutLogs: WorkoutLog[]; onSelectExercise?: (exerciseId: string) => void }) {
  const today = getLocalDateKey();
  const [range, setRange] = useState<ReportRange>('weekly');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [monthDate, setMonthDate] = useState(() => { const date = parseDateKey(today); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<DailyWorkoutReport | null>(null);
  const recent7Days = useMemo(() => buildRollingWorkoutSummary(workoutLogs, today, 7), [workoutLogs, today]);
  const recent4Weeks = useMemo(() => buildRollingWorkoutSummary(workoutLogs, today, 28), [workoutLogs, today]);
  const currentReport = useMemo(() => range === 'weekly' ? buildWeeklyReport(workoutLogs, weekStart) : buildMonthlyReport(workoutLogs, monthDate.getFullYear(), monthDate.getMonth() + 1), [range, workoutLogs, weekStart, monthDate]);
  const previousReport = useMemo(() => range === 'weekly' ? buildWeeklyReport(workoutLogs, shiftDateKey(weekStart, -7)) : buildMonthlyReport(workoutLogs, new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1).getFullYear(), new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1).getMonth() + 1), [range, workoutLogs, weekStart, monthDate]);
  const delta: ReportMetricTotals = getPreviousPeriodDelta(currentReport, previousReport);
  const firstRecordDate = workoutLogs.map((log) => log.date).sort()[0];
  const earliestWeek = firstRecordDate ? getWeekStart(firstRecordDate) : getWeekStart(today);
  const earliestMonth = firstRecordDate ? firstRecordDate.slice(0, 7) : today.slice(0, 7);
  const canGoPrevious = range === 'weekly' ? weekStart > earliestWeek : monthKey(monthDate) > earliestMonth;
  const canGoNext = range === 'weekly' ? shiftDateKey(weekStart, 7) <= getWeekStart(today) : monthKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)) <= today.slice(0, 7);
  function movePeriod(direction: -1 | 1) { if (range === 'weekly') setWeekStart((current) => shiftDateKey(current, direction * 7)); else setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)); }
  const topExercise = currentReport.topExercises[0];

  return <div className="workout-report-panel">
    <section className="report-rolling-summary">
      <div className="report-section__heading"><strong>최근 운동시간</strong><span>세션 타이머 기준</span></div>
      <div className="report-rolling-summary__grid">
        <div><span>최근 7일</span><strong>{formatRollingDuration(recent7Days.totalSeconds)}</strong><small>{recent7Days.activeDays}일 · {recent7Days.logCount}회</small></div>
        <div><span>최근 4주</span><strong>{formatRollingDuration(recent4Weeks.totalSeconds)}</strong><small>{recent4Weeks.activeDays}일 · {recent4Weeks.logCount}회</small></div>
      </div>
    </section>

    <div className="report-range-tabs" role="tablist" aria-label="리포트 기간"><button type="button" role="tab" aria-selected={range === 'weekly'} className={range === 'weekly' ? 'is-active' : ''} onClick={() => setRange('weekly')}>주간</button><button type="button" role="tab" aria-selected={range === 'monthly'} className={range === 'monthly' ? 'is-active' : ''} onClick={() => setRange('monthly')}>월간</button></div>
    <div className="report-period-nav"><button type="button" aria-label="이전 기간" disabled={!canGoPrevious} onClick={() => movePeriod(-1)}>‹</button><div><span>{range === 'weekly' ? 'WEEKLY REPORT' : 'MONTHLY REPORT'}</span><strong>{formatPeriod(range, currentReport)}</strong></div><button type="button" aria-label="다음 기간" disabled={!canGoNext} onClick={() => movePeriod(1)}>›</button></div>
    <div className="report-metric-grid"><MetricCard label="운동일" value={currentReport.totals.activeDays} unit="일" delta={delta.activeDays} /><MetricCard label="기록 횟수" value={currentReport.totals.logCount} unit="회" delta={delta.logCount} /><MetricCard label="운동 종목" value={currentReport.totals.exerciseCount} unit="종" delta={delta.exerciseCount} /><MetricCard label="운동 시간" value={currentReport.totals.durationMinutes} unit="분" delta={delta.durationMinutes} /><MetricCard label="총 세트" value={currentReport.totals.sets} unit="세트" delta={delta.sets} /><MetricCard label="총 반복" value={currentReport.totals.reps} unit="회" delta={delta.reps} /><MetricCard label="신기록" value={currentReport.totals.personalBests} unit="개" delta={delta.personalBests} /></div>
    <section className="report-top-exercise"><span>가장 많이 한 운동</span>{topExercise ? <><button type="button" className="report-exercise-link" onClick={() => onSelectExercise?.(topExercise.exerciseId)} disabled={!onSelectExercise}><strong>{topExercise.name}</strong></button><p>{topExercise.activeDays}일 동안 운동했어요</p></> : <><strong>아직 기록이 없어요</strong><p>운동을 기록하면 여기에 표시돼요.</p></>}</section>
    {range === 'weekly' ? <WeeklyDays report={currentReport} onSelect={setSelectedDay} /> : <MonthlyCalendar report={currentReport} onSelect={setSelectedDay} />}
    <WorkoutHistoryList workoutLogs={workoutLogs} onSelectDay={setSelectedDay} />
    <CategoryBars report={currentReport} />
    <WorkoutDayDetailSheet report={selectedDay} onClose={() => setSelectedDay(null)} onSelectExercise={onSelectExercise} />
  </div>;
}
