import type { PackDefinition } from '../types';

export const PACKS: PackDefinition[] = [
  { id: 'pack-basic', type: 'basic', name: '기본 운동팩', packAsset: 'pack-basic', favoredCategories: [] },
  { id: 'pack-lower-body', type: 'lower-body', name: '하체 운동팩', packAsset: 'pack-lower-body', favoredCategories: ['legs'] },
  { id: 'pack-upper-body', type: 'upper-body', name: '상체 운동팩', packAsset: 'pack-upper-body', favoredCategories: ['chest', 'back', 'shoulders', 'arms'] },
  { id: 'pack-cardio', type: 'cardio', name: '유산소 운동팩', packAsset: 'pack-cardio', favoredCategories: ['cardio'] },
  { id: 'pack-full-body', type: 'full-body', name: '전신 운동팩', packAsset: 'pack-full-body', favoredCategories: [] },
  { id: 'pack-weekly-goal', type: 'weekly-goal', name: '주간 목표 달성팩', packAsset: 'pack-weekly-goal', favoredCategories: [] },
  { id: 'pack-streak-reward', type: 'streak-reward', name: '연속 운동 보상팩', packAsset: 'pack-streak-reward', favoredCategories: [] },
  { id: 'pack-special-challenge', type: 'special-challenge', name: '특별 챌린지팩', packAsset: 'pack-special-challenge', favoredCategories: [] },
  { id: 'pack-set-completion', type: 'set-completion', name: '세트 완성 특별상자', packAsset: 'reward-chest', favoredCategories: [] },
  { id: 'pack-level-milestone', type: 'level-milestone', name: '레벨 마일스톤 특별팩', packAsset: 'reward-chest', favoredCategories: [] },
];

export const PACKS_BY_ID: Record<string, PackDefinition> = Object.fromEntries(PACKS.map((p) => [p.id, p]));
