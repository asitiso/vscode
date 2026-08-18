// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useViewportState } from './useViewportState';

describe('useViewportState', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('초기 화면 높이와 키보드 상태를 반환한다', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const { result } = renderHook(() => useViewportState());

    expect(result.current.layoutHeight).toBe(800);
    expect(result.current.isKeyboardOpen).toBe(false);
  });

  it('resize 이벤트 후 상태를 갱신한다', () => {
    let height = 800;
    vi.spyOn(window, 'innerHeight', 'get').mockImplementation(() => height);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const { result } = renderHook(() => useViewportState());
    height = 600;

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.layoutHeight).toBe(600);
  });
});
