import { describe, expect, it, vi } from 'vitest';
import {
  getVisibleViewportHeight,
  installViewportHeightSync,
  measureViewport,
  syncViewportCssVariables,
} from './viewport';

describe('measureViewport', () => {
  it('visualViewport가 없으면 innerHeight를 사용한다', () => {
    expect(measureViewport({ innerHeight: 800 })).toEqual({
      layoutHeight: 800,
      visibleHeight: 800,
      offsetTop: 0,
      keyboardHeight: 0,
      isKeyboardOpen: false,
    });
  });

  it('차이가 임계값 이상이면 키보드가 열린 것으로 판단한다', () => {
    expect(measureViewport({ innerHeight: 800, visualViewportHeight: 470 })).toMatchObject({
      visibleHeight: 470,
      offsetTop: 0,
      keyboardHeight: 330,
      isKeyboardOpen: true,
    });
  });

  it('주소창 수준의 작은 높이 변화는 키보드로 판단하지 않는다', () => {
    expect(measureViewport({ innerHeight: 800, visualViewportHeight: 720 })).toMatchObject({
      keyboardHeight: 0,
      isKeyboardOpen: false,
    });
  });

  it('visualViewport offsetTop을 보존하고 키보드 높이에서 제외한다', () => {
    expect(measureViewport({
      innerHeight: 800,
      visualViewportHeight: 610,
      visualViewportOffsetTop: 40,
    })).toMatchObject({
      offsetTop: 40,
      keyboardHeight: 0,
      isKeyboardOpen: false,
    });
  });
});

describe('mobile viewport helpers', () => {
  it('visualViewport 높이를 실제 보이는 화면 높이로 우선 사용한다', () => {
    expect(getVisibleViewportHeight({ innerHeight: 800, visualViewportHeight: 620 })).toBe(620);
  });

  it('공통 CSS 변수를 동기화한다', () => {
    const setProperty = vi.fn();
    syncViewportCssVariables({
      layoutHeight: 800,
      visibleHeight: 470,
      offsetTop: 24,
      keyboardHeight: 306,
      isKeyboardOpen: true,
    }, { setProperty });

    expect(setProperty).toHaveBeenCalledWith('--app-layout-height', '800px');
    expect(setProperty).toHaveBeenCalledWith('--app-viewport-height', '470px');
    expect(setProperty).toHaveBeenCalledWith('--app-viewport-offset-top', '24px');
    expect(setProperty).toHaveBeenCalledWith('--keyboard-height', '306px');
    expect(setProperty).toHaveBeenCalledWith('--keyboard-open', '1');
  });
});

describe('installViewportHeightSync', () => {
  it('이벤트를 등록하고 cleanup에서 모두 제거한다', () => {
    const root = { style: { setProperty: vi.fn() } } as unknown as HTMLElement;
    const visualViewport = {
      height: 600,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const windowLike = {
      innerHeight: 800,
      visualViewport,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
    };

    const cleanup = installViewportHeightSync(root, undefined, windowLike);
    cleanup();

    expect(windowLike.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(windowLike.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    expect(visualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(visualViewport.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(windowLike.removeEventListener).toHaveBeenCalledTimes(2);
    expect(visualViewport.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
