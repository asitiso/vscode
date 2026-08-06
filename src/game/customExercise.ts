import type { CustomExercise, Exercise } from '../types';

export type CustomExerciseNameError =
  | 'required'
  | 'too-long'
  | 'duplicate-custom'
  | 'duplicate-base';

export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function comparableName(name: string): string {
  return normalizeExerciseName(name).toLocaleLowerCase('ko-KR');
}

export function validateCustomExerciseName(
  input: string,
  customExercises: CustomExercise[],
  baseExercises: Exercise[],
  editingId?: string,
): { normalizedName: string; error: CustomExerciseNameError | null } {
  const normalizedName = normalizeExerciseName(input);
  if (!normalizedName) return { normalizedName, error: 'required' };
  if (normalizedName.length > 30) return { normalizedName, error: 'too-long' };

  const key = comparableName(normalizedName);
  if (customExercises.some((item) => item.id !== editingId && comparableName(item.name) === key)) {
    return { normalizedName, error: 'duplicate-custom' };
  }
  if (baseExercises.some((item) => comparableName(item.name) === key)) {
    return { normalizedName, error: 'duplicate-base' };
  }
  return { normalizedName, error: null };
}
