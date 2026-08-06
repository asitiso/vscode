import { useEffect, useState, type FormEvent } from 'react';
import './CustomExerciseEditor.css';
import { EXERCISES } from '../data/exercises';
import { validateCustomExerciseName, type CustomExerciseNameError } from '../game/customExercise';
import type { CustomExercise, ExerciseLogType } from '../types';

interface CustomExerciseEditorProps {
  customExercises: CustomExercise[];
  editingExercise?: CustomExercise | null;
  onSave: (input: { name: string; logType: ExerciseLogType }) => void;
  onCancel: () => void;
}

const ERROR_MESSAGES: Record<CustomExerciseNameError, string> = {
  required: '운동 이름을 입력해 주세요.',
  'too-long': '운동 이름은 30자 이하로 입력해 주세요.',
  'duplicate-custom': '이미 저장된 운동입니다.',
  'duplicate-base': '기본 운동 목록에 있는 운동입니다.',
};

export function CustomExerciseEditor({
  customExercises,
  editingExercise,
  onSave,
  onCancel,
}: CustomExerciseEditorProps) {
  const [name, setName] = useState(editingExercise?.name ?? '');
  const [logType, setLogType] = useState<ExerciseLogType>(editingExercise?.logType ?? 'duration');
  const [error, setError] = useState<CustomExerciseNameError | null>(null);

  useEffect(() => {
    setName(editingExercise?.name ?? '');
    setLogType(editingExercise?.logType ?? 'duration');
    setError(null);
  }, [editingExercise]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCustomExerciseName(name, customExercises, EXERCISES, editingExercise?.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSave({ name: result.normalizedName, logType });
  }

  return (
    <form className="custom-exercise-editor" onSubmit={handleSubmit}>
      <div className="custom-exercise-editor__heading">
        <strong>{editingExercise ? '운동 수정' : '새 운동 직접 입력'}</strong>
        <span>목록에 없는 운동을 저장해 다음에도 사용할 수 있어요.</span>
      </div>

      <label className="custom-exercise-editor__name">
        운동 이름
        <input
          type="text"
          maxLength={31}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          placeholder="예: 배드민턴, 랜드마인 프레스"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'custom-exercise-error' : undefined}
          autoFocus
        />
      </label>

      <fieldset className="custom-exercise-editor__types">
        <legend>기록 방식</legend>
        <label>
          <input
            type="radio"
            name="custom-exercise-log-type"
            value="duration"
            checked={logType === 'duration'}
            onChange={() => setLogType('duration')}
          />
          <span>시간 기록</span>
        </label>
        <label>
          <input
            type="radio"
            name="custom-exercise-log-type"
            value="weight-reps-sets"
            checked={logType === 'weight-reps-sets'}
            onChange={() => setLogType('weight-reps-sets')}
          />
          <span>무게·횟수·세트</span>
        </label>
      </fieldset>

      {error && (
        <p id="custom-exercise-error" className="custom-exercise-editor__error" role="alert">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="custom-exercise-editor__actions">
        <button type="button" className="custom-exercise-editor__cancel" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="custom-exercise-editor__save">
          {editingExercise ? '수정 저장' : '운동 저장'}
        </button>
      </div>
    </form>
  );
}
