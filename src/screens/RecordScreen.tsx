import { useMemo, useRef, useState } from 'react';
import './RecordScreen.css';
import { EXERCISES, EXERCISE_CATEGORY_LABELS } from '../data/exercises';
import { buildWorkoutCompletionSummary, type WorkoutCompletionSummary } from '../game/workoutCompletionSummary';
import { findNewWorkoutPackId } from '../game/workoutCompletionPack';
import { useGame } from '../store/GameContext';
import { useWorkoutSessionTimer } from '../hooks/useWorkoutSessionTimer';
import { CustomExerciseEditor } from './CustomExerciseEditor';
import { RecordSessionTimerPanel } from './RecordSessionTimerPanel';
import { WorkoutCompletionFeedback } from './WorkoutCompletionFeedback';
import type { CustomExercise, ExerciseCategory, ExerciseLogType, FeelingTag, WorkoutSetEntry } from '../types';
import type { ScreenId } from '../App';

const CATEGORIES = Array.from(new Set(EXERCISES.map((e) => e.category))) as ExerciseCategory[];
type SelectableExercise = { id: string; name: string; category: ExerciseCategory; logType: ExerciseLogType };
const FEELINGS: { id: FeelingTag; label: string; emoji: string }[] = [
  { id: 'easy', label: '가볍게 완료', emoji: '🙂' }, { id: 'moderate', label: '적당히 힘들었음', emoji: '😅' },
  { id: 'hard', label: '정말 힘들었음', emoji: '🥵' }, { id: 'personal-best', label: '기록을 경신함', emoji: '🏆' },
  { id: 'good-condition', label: '컨디션이 좋았음', emoji: '✨' }, { id: 'bad-condition', label: '컨디션이 좋지 않았음', emoji: '🌧️' },
  { id: 'completed-anyway', label: '그래도 운동 완료', emoji: '💪' },
];

export function RecordScreen({
  onDone,
  onNavigate,
}: {
  onDone: () => void;
  onNavigate: (screen: ScreenId, params?: { packId?: string }) => void;
}) {
  const game = useGame();
  const { state } = game;
  const workoutTimer = useWorkoutSessionTimer();
  const [category, setCategory] = useState<ExerciseCategory>(CATEGORIES[0]);
  const [entries, setEntries] = useState<Record<string, WorkoutSetEntry>>({});
  const [feeling, setFeeling] = useState<FeelingTag | null>(null);
  const [memo, setMemo] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CustomExercise | null>(null);
  const [completionSummary, setCompletionSummary] = useState<WorkoutCompletionSummary | null>(null);
  const packsBeforeCompletionRef = useRef<Set<string> | null>(null);
  const allExercises = useMemo<SelectableExercise[]>(() => [...EXERCISES, ...state.customExercises], [state.customExercises]);
  const completionPackId = useMemo(() => {
    if (!completionSummary || !packsBeforeCompletionRef.current) return null;
    return findNewWorkoutPackId(state.grantedPacks, packsBeforeCompletionRef.current);
  }, [completionSummary, state.grantedPacks]);

  const resolve = (id: string, snapshot?: WorkoutSetEntry): SelectableExercise | null =>
    allExercises.find((e) => e.id === id) ?? (snapshot?.exerciseName && snapshot.exerciseLogType
      ? { id, name: snapshot.exerciseName, category: 'etc', logType: snapshot.exerciseLogType } : null);

  const recent = useMemo(() => {
    const list: SelectableExercise[] = [];
    for (let i = state.workoutLogs.length - 1; i >= 0 && list.length < 5; i--) {
      for (const entry of state.workoutLogs[i].entries) {
        if (list.some((e) => e.id === entry.exerciseId)) continue;
        const item = resolve(entry.exerciseId, entry); if (item) list.push(item);
        if (list.length === 5) break;
      }
    }
    return list;
  }, [state.workoutLogs, allExercises]);

  function lastEntry(id: string) {
    for (let i = state.workoutLogs.length - 1; i >= 0; i--) {
      const found = state.workoutLogs[i].entries.find((e) => e.exerciseId === id); if (found) return found;
    }
    return null;
  }
  function fresh(exercise: SelectableExercise): WorkoutSetEntry {
    const base = { exerciseId: exercise.id, exerciseName: exercise.name, exerciseLogType: exercise.logType };
    return exercise.logType === 'duration' ? { ...base, durationMinutes: 20 } : { ...base, weightKg: 20, reps: 12, sets: 3 };
  }
  function toggle(exercise: SelectableExercise) {
    setEntries((prev) => {
      const next = { ...prev }; if (next[exercise.id]) delete next[exercise.id];
      else next[exercise.id] = { ...(lastEntry(exercise.id) ?? fresh(exercise)), exerciseName: exercise.name, exerciseLogType: exercise.logType };
      return next;
    });
  }
  const patch = (id: string, value: Partial<WorkoutSetEntry>) => setEntries((p) => ({ ...p, [id]: { ...p[id], ...value } }));
  const closeEditor = () => { setEditorOpen(false); setEditing(null); };
  function saveCustom(input: { name: string; logType: ExerciseLogType }) {
    if (editing) {
      game.updateCustomExercise(editing.id, input);
      setEntries((prev) => prev[editing.id] ? ({ ...prev, [editing.id]: { ...(input.logType === editing.logType ? prev[editing.id] : fresh({ id: editing.id, category: 'etc', ...input })), exerciseName: input.name, exerciseLogType: input.logType } }) : prev);
    } else {
      const made = game.createCustomExercise(input); setEntries((prev) => ({ ...prev, [made.id]: fresh(made) }));
    }
    closeEditor();
  }
  function removeCustom(item: CustomExercise) {
    if (!window.confirm(`${item.name}을(를) 기타 목록에서 삭제할까요?\n과거 운동 기록은 유지됩니다.`)) return;
    game.deleteCustomExercise(item.id); setEntries((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    if (editing?.id === item.id) closeEditor();
  }
  const selected = Object.values(entries);
  const complete = async () => {
    if (!selected.length || !feeling || completionSummary) return;
    let durationSeconds = workoutTimer.lastCompletedSeconds;
    if (workoutTimer.status === 'running') durationSeconds = await workoutTimer.stop();

    const summary = buildWorkoutCompletionSummary({
      durationSeconds,
      feeling,
      sessionsThisWeek: game.weeklyProgress.sessionsThisWeek,
      weeklyGoalTarget: state.user.weeklyGoal.targetSessionsPerWeek,
      countsTowardWeeklyGoal: !game.todayLogged,
    });

    packsBeforeCompletionRef.current = new Set(state.grantedPacks.map((pack) => pack.id));
    game.completeWorkout(selected, feeling, memo.trim() || undefined, durationSeconds > 0 ? durationSeconds : undefined);
    workoutTimer.discardCompleted();
    setCompletionSummary(summary);
  };
  const cancel = async () => {
    if (workoutTimer.status === 'running') await workoutTimer.stop();
    workoutTimer.discardCompleted();
    onNavigate('home');
  };
  const openCompletionPack = (packId: string) => {
    packsBeforeCompletionRef.current = null;
    onNavigate('pack-opening', { packId });
  };
  const finishCompletion = () => {
    packsBeforeCompletionRef.current = null;
    onDone();
  };

  return <div className="record-screen">
    <header className="record-screen__header"><span className="record-screen__eyebrow">TODAY WORKOUT</span><h1 className="record-screen__title">오늘 운동 기록</h1><p className="record-screen__desc">운동을 선택하고 오늘의 기록을 남겨보세요.</p></header>

    <RecordSessionTimerPanel
      status={workoutTimer.status}
      elapsedSeconds={workoutTimer.elapsedSeconds}
      lastCompletedSeconds={workoutTimer.lastCompletedSeconds}
      onStart={workoutTimer.start}
      onStop={workoutTimer.stop}
    />

    <section className="record-card record-card--exercise">
      <div className="record-card__heading"><div><span className="record-card__kicker">운동 선택</span><h2>오늘의 운동</h2></div><span className="record-card__count">{selected.length}개 선택</span></div>
      {recent.length > 0 && <div className="record-group"><h3>최근 운동</h3><div className="chip-row">{recent.map((e) => <button key={e.id} type="button" className={`chip ${entries[e.id] ? 'chip--active' : ''}`} onClick={() => toggle(e)}>{e.name}</button>)}</div></div>}
      <div className="record-group"><h3>운동 카테고리</h3><div className="chip-row">{CATEGORIES.map((c) => <button key={c} type="button" className={`chip chip--category ${category === c ? 'chip--active' : ''}`} onClick={() => setCategory(c)}>{EXERCISE_CATEGORY_LABELS[c]}</button>)}</div></div>
      <div className="record-group record-group--last"><h3>운동 선택</h3><div className="chip-row">{EXERCISES.filter((e) => e.category === category).map((e) => <button key={e.id} type="button" className={`chip ${entries[e.id] ? 'chip--active' : ''}`} onClick={() => toggle(e)}>{e.name}</button>)}</div>
        {category === 'etc' && <div className="custom-exercise-list">
          <div className="custom-exercise-list__heading"><div><strong>내 운동</strong><span>저장하면 다음 기록에서도 사용할 수 있어요.</span></div><button type="button" onClick={() => { setEditing(null); setEditorOpen(true); }}>+ 새 운동</button></div>
          {state.customExercises.length ? <div className="custom-exercise-list__items">{state.customExercises.map((e) => <div className="custom-exercise-item" key={e.id}><button type="button" className={`chip ${entries[e.id] ? 'chip--active' : ''}`} onClick={() => toggle(e)}>{e.name}</button><span>{e.logType === 'duration' ? '시간' : '무게·횟수·세트'}</span><div className="custom-exercise-item__actions"><button type="button" onClick={() => { setEditing(e); setEditorOpen(true); }}>수정</button><button type="button" onClick={() => removeCustom(e)}>삭제</button></div></div>)}</div> : <p className="custom-exercise-list__empty">아직 저장한 운동이 없습니다.</p>}
          {editorOpen && <CustomExerciseEditor customExercises={state.customExercises} editingExercise={editing} onSave={saveCustom} onCancel={closeEditor} />}
        </div>}
      </div>
    </section>
    {selected.length > 0 && <section className="record-card"><div className="record-card__heading"><div><span className="record-card__kicker">운동 수치</span><h2>운동 기록</h2></div><span className="record-card__count">{selected.length}종목</span></div><div className="set-card-list">{selected.map((entry) => { const exercise = resolve(entry.exerciseId, entry); if (!exercise) return null; return <div className="set-card" key={entry.exerciseId}><div className="set-card__name">{exercise.name}</div>{exercise.logType === 'duration' ? <div className="set-card__fields set-card__fields--single"><label>시간(분)<input type="number" inputMode="numeric" min="0" value={entry.durationMinutes ?? 0} onChange={(e) => patch(entry.exerciseId, { durationMinutes: Number(e.target.value) })} /></label></div> : <div className="set-card__fields"><label>무게(kg)<input type="number" inputMode="decimal" min="0" value={entry.weightKg ?? 0} onChange={(e) => patch(entry.exerciseId, { weightKg: Number(e.target.value) })} /></label><label>횟수<input type="number" inputMode="numeric" min="0" value={entry.reps ?? 0} onChange={(e) => patch(entry.exerciseId, { reps: Number(e.target.value) })} /></label><label>세트<input type="number" inputMode="numeric" min="0" value={entry.sets ?? 0} onChange={(e) => patch(entry.exerciseId, { sets: Number(e.target.value) })} /></label></div>}</div>; })}</div></section>}
    <section className="record-card"><div className="record-card__heading"><div><span className="record-card__kicker">컨디션 체크</span><h2>오늘의 느낌</h2></div><span className={`record-card__status ${feeling ? 'record-card__status--complete' : ''}`}>{feeling ? '선택 완료' : '필수'}</span></div><div className="feeling-grid">{FEELINGS.map((f) => <button key={f.id} type="button" className={`feeling-btn ${feeling === f.id ? 'feeling-btn--active' : ''}`} onClick={() => setFeeling(f.id)}><span className="feeling-btn__emoji">{f.emoji}</span><span>{f.label}</span></button>)}</div></section>
    <section className="record-card record-card--memo"><div className="record-card__heading"><div><span className="record-card__kicker">선택 입력</span><h2>오늘의 메모</h2></div><span className="record-card__optional">선택</span></div><textarea className="memo-input" placeholder="오늘 운동에서 기억하고 싶은 점을 짧게 적어보세요." value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} /></section>
    <div className="record-screen__actions"><button type="button" className="secondary-btn" onClick={() => void cancel()}>취소</button><button type="button" className="primary-btn" disabled={!selected.length || !feeling || Boolean(completionSummary)} onClick={() => void complete()}>기록 완료</button></div>

    {completionSummary && (
      <WorkoutCompletionFeedback
        summary={completionSummary}
        packId={completionPackId}
        onOpenPack={openCompletionPack}
        onDone={finishCompletion}
      />
    )}
  </div>;
}
