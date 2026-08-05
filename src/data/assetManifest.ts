// 실제로 준비된 PNG 에셋 목록. PlaceholderArt는 여기 등록된 assetName에 대해서만
// 실제 이미지를 렌더링하고, 나머지는 자리표시자(placeholder)로 표시한다.
// 새 PNG를 public/assets/... 아래 추가하면 여기에도 등록해야 화면에 반영된다.

export const ASSET_MANIFEST: Record<string, string> = {
  // 운동 기구 캐릭터 (public/assets/equipment/)
  'treadmill-character': '/assets/equipment/treadmill-character.png',
  'stationary-bike-character': '/assets/equipment/stationary-bike-character.png',
  'stair-climber-character': '/assets/equipment/stair-climber-character.png',
  'leg-press-character': '/assets/equipment/leg-press-character.png',
  'squat-rack-character': '/assets/equipment/squat-rack-character.png',
  'chest-press-character': '/assets/equipment/chest-press-character.png',
  'lat-pulldown-character': '/assets/equipment/lat-pulldown-character.png',
  'shoulder-press-character': '/assets/equipment/shoulder-press-character.png',
  'dumbbell-character': '/assets/equipment/dumbbell-character.png',
  'stretching-mat-character': '/assets/equipment/stretching-mat-character.png',
  'rowing-machine-character': '/assets/equipment/Rowing Machine.png',
  'leg-extension-character': '/assets/equipment/Leg Extension.png',
  'leg-curl-character': '/assets/equipment/Leg Curl.png',
  'smith-machine-character': '/assets/equipment/Smith Machine.png',
  'pec-deck-fly-character': '/assets/equipment/Pec Deck Fly.png',
  'seated-row-character': '/assets/equipment/Seated Row.png',
  'cable-machine-character': '/assets/equipment/Cable Machine.png',
  'barbell-character': '/assets/equipment/Barbell.png',
  'kettlebell-character': '/assets/equipment/Kettlebell.png',
  'ab-crunch-machine-character': '/assets/equipment/Ab Crunch Machine.png',
  'incline-bench-press-character': '/assets/equipment/Incline Bench Press.png',
  'dip-station-character': '/assets/equipment/Dip Station.png',
  'foam-roller-character': '/assets/equipment/Foam Roller.png',
  'pull-up-bar-character': '/assets/equipment/Pull-Up Bar.png',

  // 운동 기구 캐릭터 "업그레이드" 버전 — 카드 중복 10장(4성) 달성 시 해금되는
  // 특별 일러스트 (CLAUDE.md 4-3절). pickDisplayIllustration()이 골라 쓴다.
  'treadmill-character-evolved': '/assets/equipment/treadmill-character2.png',
  'stationary-bike-character-evolved': '/assets/equipment/stationary-bike-character2.png',
  'stair-climber-character-evolved': '/assets/equipment/stair-climber-character2.png',
  'leg-press-character-evolved': '/assets/equipment/leg-press-character2.png',
  'squat-rack-character-evolved': '/assets/equipment/squat-rack-character2.png',
  'chest-press-character-evolved': '/assets/equipment/chest-press-character2.png',
  'lat-pulldown-character-evolved': '/assets/equipment/lat-pulldown-character2.png',
  'shoulder-press-character-evolved': '/assets/equipment/shoulder-press-character2.png',
  'dumbbell-character-evolved': '/assets/equipment/dumbbell-character2.png',
  'stretching-mat-character-evolved': '/assets/equipment/stretching-mat-character2.png',

  // 하단 네비게이션 아이콘 (public/assets/navigation/)
  'nav-home': '/assets/navigation/nav-home.png',
  'nav-record': '/assets/navigation/nav-record.png',
  'nav-collection': '/assets/navigation/nav-collection.png',
  'nav-rewards': '/assets/navigation/nav-rewards.png',
  'nav-settings': '/assets/navigation/nav-settings.png',

  // 홈 화면 마스코트 (public/assets/characters/)
  // 임시본: 기획서 4-1/13절 기준과 다른 스타일(기구 캐릭터가 아닌 사람 캐릭터)이라
  // 추후 기구 콘셉트에 맞는 마스코트로 교체 예정. 여러 종류 중 하나를 선택할 수 있다.
  'main-character': '/assets/characters/main-character.png',
  'main-character-2': '/assets/characters/main-character-2.png',
  'main-character-3': '/assets/characters/main-character-3.png',
  'main-character-4': '/assets/characters/main-character-4.png',
  'main-character-5': '/assets/characters/main-character-5.png',

  // 카드팩 및 보상 상자 (public/assets/packs/)
  // 모든 팩은 동일한 대표 보상 상자를 사용한다.
  'pack-basic': '/assets/packs/reward-chest.svg',
  'pack-lower-body': '/assets/packs/reward-chest.svg',
  'pack-upper-body': '/assets/packs/reward-chest.svg',
  'pack-cardio': '/assets/packs/reward-chest.svg',
  'pack-full-body': '/assets/packs/reward-chest.svg',
  'pack-weekly-goal': '/assets/packs/reward-chest.svg',
  'pack-streak-reward': '/assets/packs/reward-chest.svg',
  'pack-special-challenge': '/assets/packs/reward-chest.svg',

  // 화면별 배경 (public/assets/backgrounds/)
  'home-background': '/assets/backgrounds/home-background.png',
  'pack-opening-background': '/assets/backgrounds/pack-opening-background.png',
  'record-background': '/assets/backgrounds/record-background.jpg',
  'collection-background': '/assets/backgrounds/collection-background.jpg',
  'rewards-background': '/assets/backgrounds/rewards-background.jpg',
  'settings-background': '/assets/backgrounds/settings-background.jpg',
};

/** 홈 화면에서 고를 수 있는 마스코트 캐릭터 목록 */
export const SELECTABLE_CHARACTERS: { id: string; label: string }[] = [
  { id: 'main-character', label: '민트 토끼 트레이너' },
  { id: 'main-character-2', label: '주황 여우 트레이너' },
  { id: 'main-character-3', label: '아기 드래곤 트레이너' },
  { id: 'main-character-4', label: '구름 강아지 트레이너' },
  { id: 'main-character-5', label: '너구리 트레이너' },
];

export function resolveAssetUrl(assetName: string): string | null {
  return ASSET_MANIFEST[assetName] ?? null;
}
