import type { CardDefinition } from '../types';

// 카드 등급은 카드 정의 시점에 고정한다.
export const CARDS: CardDefinition[] = [
  // ── 기본 기구 카드 (일반) ──────────────────────────────────
  { id: 'card-treadmill', exerciseId: 'treadmill', name: '러닝머신', rarity: 'common', description: '빠르게 달리는 것을 좋아하는 성실한 카드.', illustrationAsset: 'treadmill-character', evolvedIllustrationAsset: 'treadmill-character-evolved' },
  { id: 'card-stationary-bike', exerciseId: 'stationary-bike', name: '실내 자전거', rarity: 'common', description: '꾸준한 페달링으로 하루를 시작하는 카드.', illustrationAsset: 'stationary-bike-character', evolvedIllustrationAsset: 'stationary-bike-character-evolved' },
  { id: 'card-stair-climber', exerciseId: 'stair-climber', name: '스텝밀', rarity: 'common', description: '땀을 흘리면서도 포기하지 않는 카드.', illustrationAsset: 'stair-climber-character', evolvedIllustrationAsset: 'stair-climber-character-evolved' },
  { id: 'card-leg-press', exerciseId: 'leg-press', name: '레그프레스', rarity: 'common', description: '튼튼한 다리로 무게를 밀어내는 카드.', illustrationAsset: 'leg-press-character', evolvedIllustrationAsset: 'leg-press-character-evolved' },
  { id: 'card-squat-rack', exerciseId: 'squat-rack', name: '스쿼트랙', rarity: 'common', description: '하체 운동의 기본을 지키는 든든한 카드.', illustrationAsset: 'squat-rack-character', evolvedIllustrationAsset: 'squat-rack-character-evolved' },
  { id: 'card-chest-press', exerciseId: 'chest-press', name: '체스트프레스', rarity: 'common', description: '가슴을 활짝 펴고 미는 힘을 자랑하는 카드.', illustrationAsset: 'chest-press-character', evolvedIllustrationAsset: 'chest-press-character-evolved' },
  { id: 'card-lat-pulldown', exerciseId: 'lat-pulldown', name: '랫풀다운', rarity: 'common', description: '등에 작은 날개를 가진 차분한 카드.', illustrationAsset: 'lat-pulldown-character', evolvedIllustrationAsset: 'lat-pulldown-character-evolved' },
  { id: 'card-shoulder-press', exerciseId: 'shoulder-press', name: '숄더프레스', rarity: 'common', description: '어깨를 곧게 펴고 하늘을 미는 카드.', illustrationAsset: 'shoulder-press-character', evolvedIllustrationAsset: 'shoulder-press-character-evolved' },
  { id: 'card-dumbbell', exerciseId: 'dumbbell', name: '덤벨', rarity: 'common', description: '늘 짝을 이루어 다니는 쌍둥이 카드.', illustrationAsset: 'dumbbell-character', evolvedIllustrationAsset: 'dumbbell-character-evolved' },
  { id: 'card-stretching-mat', exerciseId: 'stretching-mat', name: '스트레칭 매트', rarity: 'common', description: '몸과 마음을 차분히 풀어주는 카드.', illustrationAsset: 'stretching-mat-character', evolvedIllustrationAsset: 'stretching-mat-character-evolved' },
  { id: 'card-rowing-machine', exerciseId: 'rowing-machine', name: '로잉머신', rarity: 'common', description: '전신의 리듬을 타며 힘차게 당기는 카드.', illustrationAsset: 'rowing-machine-character' },
  { id: 'card-leg-extension', exerciseId: 'leg-extension', name: '레그익스텐션', rarity: 'common', description: '허벅지 앞쪽을 집중적으로 단련하는 카드.', illustrationAsset: 'leg-extension-character' },
  { id: 'card-leg-curl', exerciseId: 'leg-curl', name: '레그컬', rarity: 'common', description: '다리 뒤쪽을 조용하고 강하게 단련하는 카드.', illustrationAsset: 'leg-curl-character' },
  { id: 'card-smith-machine', exerciseId: 'smith-machine', name: '스미스머신', rarity: 'common', description: '안정적인 궤도로 힘을 밀어 올리는 카드.', illustrationAsset: 'smith-machine-character' },
  { id: 'card-pec-deck-fly', exerciseId: 'pec-deck-fly', name: '펙덱플라이', rarity: 'common', description: '가슴을 활짝 열고 힘차게 모아주는 카드.', illustrationAsset: 'pec-deck-fly-character' },
  { id: 'card-seated-row', exerciseId: 'seated-row', name: '시티드로우', rarity: 'common', description: '등을 곧게 세우고 묵직하게 당기는 카드.', illustrationAsset: 'seated-row-character' },
  { id: 'card-cable-machine', exerciseId: 'cable-machine', name: '케이블머신', rarity: 'common', description: '다양한 동작을 자유롭게 소화하는 만능 카드.', illustrationAsset: 'cable-machine-character' },
  { id: 'card-barbell', exerciseId: 'barbell', name: '바벨', rarity: 'common', description: '양쪽 무게를 균형 있게 들어 올리는 카드.', illustrationAsset: 'barbell-character' },
  { id: 'card-kettlebell', exerciseId: 'kettlebell', name: '케틀벨', rarity: 'common', description: '폭발적인 움직임과 추진력을 가진 카드.', illustrationAsset: 'kettlebell-character' },
  { id: 'card-ab-crunch-machine', exerciseId: 'ab-crunch-machine', name: '복근운동 기구', rarity: 'common', description: '몸을 단단히 말아 코어를 깨우는 카드.', illustrationAsset: 'ab-crunch-machine-character' },
  { id: 'card-incline-bench-press', exerciseId: 'incline-bench-press', name: '인클라인 벤치프레스', rarity: 'common', description: '윗가슴을 향해 힘차게 밀어 올리는 카드.', illustrationAsset: 'incline-bench-press-character' },
  { id: 'card-dip-station', exerciseId: 'dip-station', name: '딥스 스탠드', rarity: 'common', description: '몸을 단단히 지탱하며 깊게 내려가는 카드.', illustrationAsset: 'dip-station-character' },
  { id: 'card-foam-roller', exerciseId: 'foam-roller', name: '폼롤러', rarity: 'common', description: '뭉친 근육을 부드럽게 풀어주는 회복 카드.', illustrationAsset: 'foam-roller-character' },
  { id: 'card-pull-up-bar', exerciseId: 'pull-up-bar', name: '풀업 바', rarity: 'common', description: '높은 곳을 향해 끝까지 당겨 올라가는 카드.', illustrationAsset: 'pull-up-bar-character' },

  // ── 신규 기구·스포츠 카드 (일반) ─────────────────────────
  { id: 'card-gym-ball', exerciseId: 'gym-ball', name: '짐볼', rarity: 'common', description: '균형을 잡으며 코어를 부드럽게 깨우는 카드.', illustrationAsset: 'gym-ball-character' },
  { id: 'card-arm-curl-machine', exerciseId: 'arm-curl-machine', name: '암 컬 머신', rarity: 'common', description: '팔의 힘을 집중해서 차곡차곡 쌓아가는 카드.', illustrationAsset: 'arm-curl-machine-character' },
  { id: 'card-elliptical', exerciseId: 'elliptical', name: '일립티컬', rarity: 'common', description: '부드러운 리듬으로 전신을 움직이는 유산소 카드.', illustrationAsset: 'elliptical-character' },
  { id: 'card-loop-band', exerciseId: 'loop-band', name: '루프 밴드', rarity: 'common', description: '가볍지만 탄탄하게 자극을 주는 밴드 카드.', illustrationAsset: 'loop-band-character' },
  { id: 'card-hammer-curl', exerciseId: 'hammer-curl', name: '해머 컬', rarity: 'common', description: '묵직한 그립으로 팔 힘을 다지는 카드.', illustrationAsset: 'hammer-curl-character' },
  { id: 'card-decline-bench', exerciseId: 'decline-bench', name: '디클라인 벤치', rarity: 'common', description: '가슴 하부를 강하게 공략하는 카드.', illustrationAsset: 'decline-bench-character' },
  { id: 'card-outdoor-running', exerciseId: 'outdoor-running', name: '야외 러닝', rarity: 'common', description: '바람을 가르며 밖으로 달려나가는 카드.', illustrationAsset: 'outdoor-running-character' },
  { id: 'card-swimming', exerciseId: 'swimming', name: '수영', rarity: 'common', description: '물살을 가르며 전신을 단련하는 카드.', illustrationAsset: 'swimming-character' },
  { id: 'card-badminton', exerciseId: 'badminton', name: '배드민턴', rarity: 'common', description: '빠른 스텝과 반응으로 리듬을 만드는 카드.', illustrationAsset: 'badminton-character' },
  { id: 'card-golf', exerciseId: 'golf', name: '골프', rarity: 'common', description: '정교한 스윙으로 집중력을 쌓는 카드.', illustrationAsset: 'golf-character' },
  { id: 'card-tennis', exerciseId: 'tennis', name: '테니스', rarity: 'common', description: '민첩한 움직임과 타이밍이 돋보이는 카드.', illustrationAsset: 'tennis-character' },
  { id: 'card-pilates-reformer', exerciseId: 'pilates-reformer', name: '필라테스 리포머', rarity: 'common', description: '균형과 코어를 정교하게 다듬는 카드.', illustrationAsset: 'pilates-reformer-character' },
  { id: 'card-trekking', exerciseId: 'trekking', name: '트레킹', rarity: 'common', description: '꾸준한 걸음으로 체력을 쌓아가는 카드.', illustrationAsset: 'trekking-character' },
  { id: 'card-crossfit', exerciseId: 'crossfit', name: '크로스핏', rarity: 'common', description: '강도 높은 움직임으로 한계를 넘는 카드.', illustrationAsset: 'crossfit-character' },
  { id: 'card-outdoor-cycling', exerciseId: 'outdoor-cycling', name: '자전거 라이딩', rarity: 'common', description: '페달을 밟으며 지구력을 키우는 카드.', illustrationAsset: 'outdoor-cycling-character' },
  { id: 'card-climbing', exerciseId: 'climbing', name: '클라이밍', rarity: 'common', description: '손끝과 코어의 힘으로 높이를 오르는 카드.', illustrationAsset: 'climbing-character' },

  // ── 테마 카드 (레어) ──────────────────────────────────────
  { id: 'card-cardio-theme', exerciseId: 'treadmill', name: '유산소 데이', rarity: 'rare', description: '숨이 차도록 달린 날에만 만날 수 있는 카드.', illustrationAsset: 'cardio-theme-character' },
  { id: 'card-legs-theme', exerciseId: 'leg-press', name: '하체 집중 데이', rarity: 'rare', description: '다음 날 계단이 무서워지는 그 카드.', illustrationAsset: 'legs-theme-character' },
  { id: 'card-chest-theme', exerciseId: 'chest-press', name: '가슴 집중 데이', rarity: 'rare', description: '미는 힘을 모두 쏟아낸 날의 카드.', illustrationAsset: 'chest-theme-character' },
  { id: 'card-back-theme', exerciseId: 'lat-pulldown', name: '등 집중 데이', rarity: 'rare', description: '당기는 힘이 폭발한 날의 카드.', illustrationAsset: 'back-theme-character' },
  { id: 'card-shoulders-theme', exerciseId: 'shoulder-press', name: '어깨 집중 데이', rarity: 'rare', description: '어깨가 으쓱해지는 날의 카드.', illustrationAsset: 'shoulders-theme-character' },
  { id: 'card-arms-theme', exerciseId: 'dumbbell', name: '팔 집중 데이', rarity: 'rare', description: '팔이 후들거려도 웃게 되는 카드.', illustrationAsset: 'arms-theme-character' },

  // ── 마스터 카드 (슈퍼 레어) ────────────────────────────────
  { id: 'card-cardio-master', exerciseId: 'stair-climber', name: '유산소 마스터', rarity: 'super-rare', description: '오랜 유산소 습관이 만든 특별한 카드.', illustrationAsset: 'cardio-master-character' },
  { id: 'card-strength-master', exerciseId: 'squat-rack', name: '근력 마스터', rarity: 'super-rare', description: '무거운 무게를 두려워하지 않는 카드.', illustrationAsset: 'strength-master-character' },
  { id: 'card-flexibility-master', exerciseId: 'stretching-mat', name: '유연성 마스터', rarity: 'super-rare', description: '꾸준한 스트레칭이 만들어낸 카드.', illustrationAsset: 'flexibility-master-character' },

  // ── 특별 트레이너 카드 (레전드) ─────────────────────────────
  { id: 'card-leg-day-legend', exerciseId: 'squat-rack', name: '레그데이 전설', rarity: 'legendary', description: '하체의 날에만 아주 드물게 나타나는 전설의 카드.', illustrationAsset: 'leg-day-legend-character' },
  { id: 'card-full-body-legend', exerciseId: 'dumbbell', name: '전신 운동 전설', rarity: 'legendary', description: '모든 부위를 고르게 단련한 사람에게만 나타나는 카드.', illustrationAsset: 'full-body-legend-character' },
];

export const CARDS_BY_ID: Record<string, CardDefinition> = Object.fromEntries(
  CARDS.map((c) => [c.id, c]),
);

export const CARDS_BY_RARITY: Record<CardDefinition['rarity'], CardDefinition[]> = {
  common: CARDS.filter((c) => c.rarity === 'common'),
  rare: CARDS.filter((c) => c.rarity === 'rare'),
  'super-rare': CARDS.filter((c) => c.rarity === 'super-rare'),
  legendary: CARDS.filter((c) => c.rarity === 'legendary'),
};
