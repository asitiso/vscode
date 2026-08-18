import { describe, expect, it } from 'vitest';
import { getBottomNavState } from './bottomNavState';

describe('getBottomNavState', () => {
  it('그룹 화면에서는 하단 네비를 표시하되 활성 탭은 두지 않는다', () => {
    expect(getBottomNavState('group', false)).toEqual({
      visible: true,
      active: null,
    });
  });

  it('카드팩 화면과 키보드가 열린 동안에는 하단 네비를 숨긴다', () => {
    expect(getBottomNavState('pack-opening', false).visible).toBe(false);
    expect(getBottomNavState('group', true).visible).toBe(false);
  });
});
