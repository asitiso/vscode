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
      <div className="record-screen__header">
        <h1 className="record-screen__title">오늘 운동 기록</h1>
      </div>

      {recentExerciseIds.length > 0 && (
        <section className="record-section">
          <h2>최근 운동</h2>
          <div className="chip-row">
            {recentExerciseIds.map((id) => {
              const exercise = EXERCISES.find((e) => e.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  className={`chip ${entries[id] ? 'chip--active' : ''}`}
                  onClick={() => toggleExercise(id)}
                >
                  {exercise.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="record-section">
        <h2>운동 카테고리</h2>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'chip--active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {EXERCISE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {exercisesInCategory.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className={`chip ${entries[exercise.id] ? 'chip--active' : ''}`}
              onClick={() => toggleExercise(exercise.id)}
            >
              {exercise.name}
            </button>
          ))}
        </div>
      </section>

      {selectedList.length > 0 && (
        <section className="record-section">
          <h2>세트 기록</h2>
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
                        value={entry.weightKg ?? 0}
                        onChange={(e) => updateEntry(entry.exerciseId, { weightKg: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      횟수
                      <input
                        type="number"
                        value={entry.reps ?? 0}
                        onChange={(e) => updateEntry(entry.exerciseId, { reps: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      세트
                      <input
                        type="number"
                        value={entry.sets ?? 0}
                        onChange={(e) => updateEntry(entry.exerciseId, { sets: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="set-card__fields">
                    <label>
                      시간(분)
                      <input
                        type="number"
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
        </section>
      )}

      <section className="record-section">
        <h2>오늘의 느낌</h2>
        <div className="feeling-grid">
          {FEELINGS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`feeling-btn ${feeling === f.id ? 'feeling-btn--active' : ''}`}
              onClick={() => setFeeling(f.id)}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="record-section">
        <h2>메모 (선택)</h2>
        <textarea
          className="memo-input"
          placeholder="오늘 운동에서 기억하고 싶은 점을 짧게 적어보세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
        />
      </section>

      <div className="record-screen__actions">
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
