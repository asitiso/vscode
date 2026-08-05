import type { Exercise } from '../types';

// 기본 운동기구 24종. characterAsset은 public/assets/equipment 아래
// PNG와 assetManifest의 키를 통해 연결된다.
export const EXERCISES: Exercise[] = [
  { id: 'treadmill', name: '러닝머신', category: 'cardio', logType: 'duration', characterAsset: 'treadmill-character', linkedCardIds: ['card-treadmill', 'card-cardio-theme'] },
  { id: 'stationary-bike', name: '실내 자전거', category: 'cardio', logType: 'duration', characterAsset: 'stationary-bike-character', linkedCardIds: ['card-stationary-bike', 'card-cardio-theme'] },
  { id: 'stair-climber', name: '스텝밀', category: 'cardio', logType: 'duration', characterAsset: 'stair-climber-character', linkedCardIds: ['card-stair-climber', 'card-cardio-theme'] },
  { id: 'leg-press', name: '레그프레스', category: 'legs', logType: 'weight-reps-sets', characterAsset: 'leg-press-character', linkedCardIds: ['card-leg-press', 'card-legs-theme'] },
  { id: 'squat-rack', name: '스쿼트랙', category: 'legs', logType: 'weight-reps-sets', characterAsset: 'squat-rack-character', linkedCardIds: ['card-squat-rack', 'card-legs-theme'] },
  { id: 'chest-press', name: '체스트프레스', category: 'chest', logType: 'weight-reps-sets', characterAsset: 'chest-press-character', linkedCardIds: ['card-chest-press', 'card-chest-theme'] },
  { id: 'lat-pulldown', name: '랫풀다운', category: 'back', logType: 'weight-reps-sets', characterAsset: 'lat-pulldown-character', linkedCardIds: ['card-lat-pulldown', 'card-back-theme'] },
  { id: 'shoulder-press', name: '숄더프레스', category: 'shoulders', logType: 'weight-reps-sets', characterAsset: 'shoulder-press-character', linkedCardIds: ['card-shoulder-press', 'card-shoulders-theme'] },
  { id: 'dumbbell', name: '덤벨', category: 'arms', logType: 'weight-reps-sets', characterAsset: 'dumbbell-character', linkedCardIds: ['card-dumbbell', 'card-arms-theme'] },
  { id: 'stretching-mat', name: '스트레칭 매트', category: 'stretching', logType: 'duration', characterAsset: 'stretching-mat-character', linkedCardIds: ['card-stretching-mat'] },
  { id: 'rowing-machine', name: '로잉머신', category: 'cardio', logType: 'duration', characterAsset: 'rowing-machine-character', linkedCardIds: ['card-rowing-machine'] },
  { id: 'leg-extension', name: '레그익스텐션', category: 'legs', logType: 'weight-reps-sets', characterAsset: 'leg-extension-character', linkedCardIds: ['card-leg-extension'] },
  { id: 'leg-curl', name: '레그컬', category: 'legs', logType: 'weight-reps-sets', characterAsset: 'leg-curl-character', linkedCardIds: ['card-leg-curl'] },
  { id: 'smith-machine', name: '스미스머신', category: 'etc', logType: 'weight-reps-sets', characterAsset: 'smith-machine-character', linkedCardIds: ['card-smith-machine'] },
  { id: 'pec-deck-fly', name: '펙덱플라이', category: 'chest', logType: 'weight-reps-sets', characterAsset: 'pec-deck-fly-character', linkedCardIds: ['card-pec-deck-fly'] },
  { id: 'seated-row', name: '시티드로우', category: 'back', logType: 'weight-reps-sets', characterAsset: 'seated-row-character', linkedCardIds: ['card-seated-row'] },
  { id: 'cable-machine', name: '케이블머신', category: 'etc', logType: 'weight-reps-sets', characterAsset: 'cable-machine-character', linkedCardIds: ['card-cable-machine'] },
  { id: 'barbell', name: '바벨', category: 'etc', logType: 'weight-reps-sets', characterAsset: 'barbell-character', linkedCardIds: ['card-barbell'] },
  { id: 'kettlebell', name: '케틀벨', category: 'etc', logType: 'weight-reps-sets', characterAsset: 'kettlebell-character', linkedCardIds: ['card-kettlebell'] },
  { id: 'ab-crunch-machine', name: '복근운동 기구', category: 'abs', logType: 'weight-reps-sets', characterAsset: 'ab-crunch-machine-character', linkedCardIds: ['card-ab-crunch-machine'] },
  { id: 'incline-bench-press', name: '인클라인 벤치프레스', category: 'chest', logType: 'weight-reps-sets', characterAsset: 'incline-bench-press-character', linkedCardIds: ['card-incline-bench-press'] },
  { id: 'dip-station', name: '딥스 스탠드', category: 'chest', logType: 'weight-reps-sets', characterAsset: 'dip-station-character', linkedCardIds: ['card-dip-station'] },
  { id: 'foam-roller', name: '폼롤러', category: 'stretching', logType: 'duration', characterAsset: 'foam-roller-character', linkedCardIds: ['card-foam-roller'] },
  { id: 'pull-up-bar', name: '풀업 바', category: 'back', logType: 'weight-reps-sets', characterAsset: 'pull-up-bar-character', linkedCardIds: ['card-pull-up-bar'] },
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
