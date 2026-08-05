import { useMemo, useState } from 'react';
import './RecordScreen.css';
import { EXERCISES, EXERCISE_CATEGORY_LABELS } from '../data/exercises';
import { useGame } from '../store/GameContext';
import type { ExerciseCategory, FeelingTag, WorkoutSetEntry } from '../types';
import type { ScreenId } from '../App';

const CATEGORIES = Array.from(new Set(EXERCISES.map((e) => e.category))) as ExerciseCategory[];

const FEELINGS: { id: FeelingTag; label: string; emoji: string }[] = [
  { id: 'easy', label: '가볍게 완료', emoji: '🙂' },
  { id: 'moderate', label: '적당히 힘들었음', emoji: '😅' },
  { id: 'hard', label: '정말 힘들었음', emoji: '🥵' },
  { id: 'personal-best', label: '기록을 경신함', emoji: '🏆' },
  { id: 'good-condition', label: '컨디션이 좋았음', emoji: '✨' },
  { id: 'bad-condition', label: '컨디션이 좋지 않았음', emoji: '🌧️' },
  { id: 'completed-anyway', label: '그래도 운동 완료', emoji: '💪' },
];

interface RecordScreenProps {
  onDone: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function RecordScreen({ onDone, onNavigate }: RecordScreenProps) {
  const { state, completeWorkout } = useGame();
  const [category, setCategory] = useState<ExerciseCategory>(CATEGORIES[0]);
  const [entries, setEntries] = useState<Record<string, WorkoutSetEntry>>({});
  const [feeling, setFeeling] = useState<FeelingTag | null>(null);
  const [memo, setMemo] = useState('');

  const recentExerciseIds = useMemo(() => {
    const ids: string[] = [];
    for (let i = state.workoutLogs.length - 1; i >= 0 && ids.length < 5; i--) {
      for (const e of state.workoutLogs[i].entries) {
        if (!ids.includes(e.exerciseId)) ids.push(e.exerciseId);
      }
    }
    return ids;
  }, [state.workoutLogs]);

  const exercisesInCategory = EXERCISES.filter((e) => e.category === category);

  function findLastEntry(exerciseId: string): WorkoutSetEntry | null {
    for (let i = state.workoutLogs.length - 1; i >= 0; i--) {
      const found = state.workoutLogs[i].entries.find((e) => e.exerciseId === exerciseId);
      if (found) return found;
    }
    return null;
  }

  function toggleExercise(exerciseId: string) {
    setEntries((prev) => {
      const next = { ...prev };
      if (next[exerciseId]) {
        delete next[exerciseId];
      } else {
        const last = findLastEntry(exerciseId);
        const exercise = EXERCISES.find((e) => e.id === exerciseId)!;
        next[exerciseId] =
          last ?? (exercise.logType === 'duration'
            ? { exerciseId, durationMinutes: 20 }
            : { exerciseId, weightKg: 20, reps: 12, sets: 3 });
      }
      return next;
    });
  }

  function updateEntry(exerciseId: string, patch: Partial<WorkoutSetEntry>) {
    setEntries((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], ...patch } }));
  }

  const selectedList = Object.values(entries);
  const canComplete = selectedList.length > 0 && feeling !== null;

  function handleComplete() {
    if (!canComplete || !feeling) return;
    completeWorkout(selectedList, feeling, memo.trim() || undefined);
    onDone();
  }

  return (
    <div className="record-screen">
      <header className="record-screen__header">
        <span className="record-screen__eyebrow">TODAY WORKOUT</span>
        <h1 className="record-screen__title">오늘 운동 기록</h1>
        <p className="record-screen__desc">운동을 선택하고 오늘의 기록을 남겨보세요.</p>
      </header>

      <section className="record-card record-card--exercise">
        <div className="record-card__heading">
          <div>
            <span className="record-card__kicker">운동 선택</span>
            <h2>오늘의 운동</h2>
          </div>
          <span className="record-card__count">{selectedList.length}개 선택</span>
        </div>

        {recentExerciseIds.length > 0 && (
          <div className="record-group">
            <h3>최근 운동</h3>
            <div className="chip-row">
              {recentExerciseIds.map((id) => {
                const exercise = EXERCISES.find((e) => e.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${entries[id] ? 'chip--active' : ''}`}
                    onClick={() => toggleExercise(id)}
                    aria-pressed={Boolean(entries[id])}
                  >
                    {exercise.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="record-group">
          <h3>운동 카테고리</h3>
          <div className="chip-row">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip chip--category ${category === c ? 'chip--active' : ''}`}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                {EXERCISE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="record-group record-group--last">
          <h3>운동 선택</h3>
          <div className="chip-row">
            {exercisesInCategory.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className={`chip ${entries[exercise.id] ? 'chip--active' : ''}`}
                onClick={() => toggleExercise(exercise.id)}
                aria-pressed={Boolean(entries[exercise.id])}
              >
                {exercise.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedList.length > 0 && (
        <section className="record-card">
          <div className="record-card__heading">
            <div>
              <span className="record-card__kicker">운동 수치</span>
              <h2>운동 기록</h2>
            </div>
            <span className="record-card__count">{selectedList.length}종목</span>
          </div>

          <div className="set-card-list">
            {selectedList.map((entry) => {
              const exercise = EXERCISES.find((e) => e.id === entry.exerciseId)!;
              return (
                <div key={entry.exerciseId} className="set-card">
                  <div className="set-card__name">{exercise.name}</div>
                  {exercise.logType === 'weight-reps-sets' ? (
                    <div className="set-card__fields">
                      <label>
                        무게(kg)
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={entry.weightKg ?? 0}
                          onChange={(e) => updateEntry(entry.exerciseId, { weightKg: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        횟수
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={entry.reps ?? 0}
                          onChange={(e) => updateEntry(entry.exerciseId, { reps: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        세트
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={entry.sets ?? 0}
                          onChange={(e) => updateEntry(entry.exerciseId, { sets: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="set-card__fields set-card__fields--single">
                      <label>
                        시간(분)
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={entry.durationMinutes ?? 0}
                          onChange={(e) =>
                            updateEntry(entry.exerciseId, { durationMinutes: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="record-card">
        <div className="record-card__heading">
          <div>
            <span className="record-card__kicker">컨디션 체크</span>
            <h2>오늘의 느낌</h2>
          </div>
          <span className={`record-card__status ${feeling ? 'record-card__status--complete' : ''}`}>
            {feeling ? '선택 완료' : '필수'}
          </span>
        </div>

        <div className="feeling-grid">
          {FEELINGS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`feeling-btn ${feeling === f.id ? 'feeling-btn--active' : ''}`}
              onClick={() => setFeeling(f.id)}
              aria-pressed={feeling === f.id}
            >
              <span className="feeling-btn__emoji">{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="record-card record-card--memo">
        <div className="record-card__heading">
          <div>
            <span className="record-card__kicker">선택 입력</span>
            <h2>오늘의 메모</h2>
          </div>
          <span className="record-card__optional">선택</span>
        </div>
        <textarea
          className="memo-input"
          placeholder="오늘 운동에서 기억하고 싶은 점을 짧게 적어보세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
        />
      </section>

      <div className="record-screen__actions" aria-label="운동 기록 작업">
        <button type="button" className="secondary-btn" onClick={() => onNavigate('home')}>
          취소
        </button>
        <button type="button" className="primary-btn" disabled={!canComplete} onClick={handleComplete}>
          기록 완료
        </button>
      </div>
    </div>
  );
}
