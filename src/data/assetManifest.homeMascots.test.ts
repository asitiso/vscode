import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, SELECTABLE_CHARACTERS } from './assetManifest';

describe('home equipment mascots', () => {
  const expected = [
    {
      id: 'main-character',
      label: '러닝머신 캐릭터',
      path: '/assets/equipment/treadmill-character.png',
    },
    {
      id: 'main-character-2',
      label: '실내 자전거 캐릭터',
      path: '/assets/equipment/stationary-bike-character.png',
    },
    {
      id: 'main-character-3',
      label: '레그프레스 캐릭터',
      path: '/assets/equipment/leg-press-character.png',
    },
    {
      id: 'main-character-4',
      label: '덤벨 캐릭터',
      path: '/assets/equipment/dumbbell-character.png',
    },
    {
      id: 'main-character-5',
      label: '스트레칭 매트 캐릭터',
      path: '/assets/equipment/stretching-mat-character.png',
    },
  ];

  it('keeps saved character ids while mapping them to equipment mascot artwork', () => {
    expect(SELECTABLE_CHARACTERS).toEqual(
      expected.map(({ id, label }) => ({ id, label })),
    );

    for (const mascot of expected) {
      expect(ASSET_MANIFEST[mascot.id]).toBe(mascot.path);
    }
  });
});
