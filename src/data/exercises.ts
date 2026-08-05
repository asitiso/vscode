import type { Exercise } from '../types';

// 1차 제작 대상 10종 (CLAUDE.md 16절)
// characterAsset은 assets/equipment/ 아래 PNG 파일명(확장자 제외)이며
// 아직 이미지가 없으면 UI에서 플레이스홀더로 대체 표시한다.

export const EXERCISES: Exercise[] = [
  {
    id: 'treadmill',
    name: '러닝머신',
    category: 'cardio',
    logType: 'duration',
    characterAsset: 'treadmill-character',
    linkedCardIds: ['card-treadmill', 'card-cardio-theme'],
  },
  {
    id: 'stationary-bike',
    name: '실내 자전거',
    category: 'cardio',
    logType: 'duration',
    characterAsset: 'stationary-bike-character',
    linkedCardIds: ['card-stationary-bike', 'card-cardio-theme'],
  },
  {
    id: 'stair-climber',
    name: '스텝밀',
    category: 'cardio',
    logType: 'duration',
    characterAsset: 'stair-climber-character',
    linkedCardIds: ['card-stair-climber', 'card-cardio-theme'],
  },
  {
    id: 'leg-press',
    name: '레그프레스',
    category: 'legs',
    logType: 'weight-reps-sets',
    characterAsset: 'leg-press-character',
    linkedCardIds: ['card-leg-press', 'card-legs-theme'],
  },
  {
    id: 'squat-rack',
    name: '스쿼트랙',
    category: 'legs',
    logType: 'weight-reps-sets',
    characterAsset: 'squat-rack-character',
    linkedCardIds: ['card-squat-rack', 'card-legs-theme'],
  },
  {
    id: 'chest-press',
    name: '체스트프레스',
    category: 'chest',
    logType: 'weight-reps-sets',
    characterAsset: 'chest-press-character',
    linkedCardIds: ['card-chest-press', 'card-chest-theme'],
  },
  {
    id: 'lat-pulldown',
    name: '랫풀다운',
    category: 'back',
    logType: 'weight-reps-sets',
    characterAsset: 'lat-pulldown-character',
    linkedCardIds: ['card-lat-pulldown', 'card-back-theme'],
  },
  {
    id: 'shoulder-press',
    name: '숄더프레스',
    category: 'shoulders',
    logType: 'weight-reps-sets',
    characterAsset: 'shoulder-press-character',
    linkedCardIds: ['card-shoulder-press', 'card-shoulders-theme'],
  },
  {
    id: 'dumbbell',
    name: '덤벨',
    category: 'arms',
    logType: 'weight-reps-sets',
    characterAsset: 'dumbbell-character',
    linkedCardIds: ['card-dumbbell', 'card-arms-theme'],
  },
  {
    id: 'stretching-mat',
    name: '스트레칭 매트',
    category: 'stretching',
    logType: 'duration',
    characterAsset: 'stretching-mat-character',
    linkedCardIds: ['card-stretching-mat'],
  },
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export const EXERCISE_CATEGORY_LABELS: Record<Exercise['category'], string> = {
  chest: '가슴',
  back: '등',
  shoulders: '어깨',
  arms: '팔',
  legs: '하체',
  abs: '복근',
  cardio: '유산소',
  stretching: '스트레칭',
  etc: '기타',
};
