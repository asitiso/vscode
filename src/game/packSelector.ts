import { PACKS_BY_ID } from '../data/packs';
import type { ExerciseCategory } from '../types';

const CARDIO: ExerciseCategory[] = ['cardio'];
const LOWER: ExerciseCategory[] = ['legs'];
const UPPER: ExerciseCategory[] = ['chest', 'back', 'shoulders', 'arms'];

/**
 * 오늘 기록한 운동 카테고리를 바탕으로 지급할 기본 카드팩 종류를 정한다.
 * 상/하체를 모두 했으면 전신팩, 한쪽에 집중했으면 해당 부위팩, 유산소만 했으면
 * 유산소팩, 그 외에는 기본팩을 지급한다 (CLAUDE.md 4-4, 5절).
 */
export function selectPackForCategories(categories: ExerciseCategory[]): string {
  const hasCardio = categories.some((c) => CARDIO.includes(c));
  const hasLower = categories.some((c) => LOWER.includes(c));
  const hasUpper = categories.some((c) => UPPER.includes(c));

  if (hasLower && hasUpper) return PACKS_BY_ID['pack-full-body'].id;
  if (hasLower) return PACKS_BY_ID['pack-lower-body'].id;
  if (hasUpper) return PACKS_BY_ID['pack-upper-body'].id;
  if (hasCardio) return PACKS_BY_ID['pack-cardio'].id;
  return PACKS_BY_ID['pack-basic'].id;
}
