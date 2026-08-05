import { describe, expect, it, vi } from 'vitest';
import { getVisibleViewportHeight, syncViewportCssVariables } from './viewport';

describe('mobile viewport helpers', () => {
  it('visualViewport 높이를 실제 보이는 화면 높이로 우선 사용한다', () => {
    expect(getVisibleViewportHeight({ innerHeight: 800, visualViewportHeight: 620 })).toBe(620);
  });

  it('visualViewport가 없으면 innerHeight를 사용한다', () => {
    expect(getVisibleViewportHeight({ innerHeight: 800 })).toBe(800);
  });

  it('실제 화면 높이를 CSS 변수로 반영한다', () => {
    const setProperty = vi.fn();
    syncViewportCssVariables(
      { innerHeight: 800, visualViewportHeight: 620 },
      { setProperty },
    );
    expect(setProperty).toHaveBeenCalledWith('--app-viewport-height', '620px');
  });
});
