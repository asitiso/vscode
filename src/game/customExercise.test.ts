import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import type { CustomExercise } from '../types';
import { normalizeExerciseName, validateCustomExerciseName } from './customExercise';

const customExercises: CustomExercise[] = [
  {
    id: 'custom-1',
    name: '나만의 운동',
    category: 'etc',
    logType: 'duration',
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:00.000Z',
  },
];

describe('normalizeExerciseName', () => {
  it('앞뒤 공백과 연속 공백을 정리한다', () => {
    expect(normalizeExerciseName('  랜드마인   프레스  ')).toBe('랜드마인 프레스');
  });
});

describe('validateCustomExerciseName', () => {
  it('빈 이름을 거부한다', () => {
    expect(validateCustomExerciseName('   ', customExercises, EXERCISES).error).toBe('required');
  });

  it('30자를 초과하는 이름을 거부한다', () => {
    expect(validateCustomExerciseName('가'.repeat(31), customExercises, EXERCISES).error).toBe('too-long');
  });

  it('사용자 운동 중복을 대소문자와 공백 차이 없이 거부한다', () => {
    expect(validateCustomExerciseName(' 나만의   운동 ', customExercises, EXERCISES).error).toBe('duplicate-custom');
  });

  it('기본 운동 이름 중복을 거부한다', () => {
    expect(validateCustomExerciseName(EXERCISES[0].name, customExercises, EXERCISES).error).toBe('duplicate-base');
  });

  it('수정 중인 자기 자신은 중복에서 제외한다', () => {
    expect(validateCustomExerciseName('나만의 운동', customExercises, EXERCISES, 'custom-1').error).toBeNull();
  });
});
