import type { PackDefinition } from '../types';

export const PACKS: PackDefinition[] = [
  { id: 'pack-basic', type: 'basic', name: '기본 운동팩', packAsset: 'pack-common', favoredCategories: [] },
  { id: 'pack-lower-body', type: 'lower-body', name: '하체 운동팩', packAsset: 'pack-rare', favoredCategories: ['legs'] },
  { id: 'pack-upper-body', type: 'upper-body', name: '상체 운동팩', packAsset: 'pack-rare', favoredCategories: ['chest', 'back', 'shoulders', 'arms'] },
  { id: 'pack-cardio', type: 'cardio', name: '유산소 운동팩', packAsset: 'pack-rare', favoredCategories: ['cardio'] },
  { id: 'pack-full-body', type: 'full-body', name: '전신 운동팩', packAsset: 'pack-super-rare', favoredCategories: [] },
  { id: 'pack-weekly-goal', type: 'weekly-goal', name: '주간 목표 달성팩', packAsset: 'daily-mission-complete', favoredCategories: [] },
  { id: 'pack-streak-reward', type: 'streak-reward', name: '연속 운동 보상팩', packAsset: 'workout-streak', favoredCategories: [] },
  { id: 'pack-special-challenge', type: 'special-challenge', name: '특별 챌린지팩', packAsset: 'pack-legendary', favoredCategories: [] },
  { id: 'pack-set-completion', type: 'set-completion', name: '세트 완성 특별상자', packAsset: 'achievement-badges', favoredCategories: [] },
  { id: 'pack-level-milestone', type: 'level-milestone', name: '레벨 마일스톤 특별팩', packAsset: 'milestone-reward-chest', favoredCategories: [] },
];

export const PACKS_BY_ID: Record<string, PackDefinition> = Object.fromEntries(PACKS.map((p) => [p.id, p]));
