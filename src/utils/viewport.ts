export const KEYBOARD_OPEN_THRESHOLD_PX = 160;

export interface ViewportMeasurement {
  innerHeight: number;
  visualViewportHeight?: number;
  visualViewportOffsetTop?: number;
}

export interface ViewportState {
  layoutHeight: number;
  visibleHeight: number;
  offsetTop: number;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

interface CssVariableTarget {
  setProperty: (name: string, value: string) => void;
}

interface ViewportWindowLike {
  innerHeight: number;
  visualViewport?: {
    height: number;
    offsetTop?: number;
    addEventListener: (type: 'resize' | 'scroll', listener: () => void) => void;
    removeEventListener: (type: 'resize' | 'scroll', listener: () => void) => void;
  } | null;
  addEventListener: (type: 'resize' | 'orientationchange', listener: () => void) => void;
  removeEventListener: (type: 'resize' | 'orientationchange', listener: () => void) => void;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
}

export function measureViewport(measurement: ViewportMeasurement): ViewportState {
  const layoutHeight = Math.max(0, Math.round(measurement.innerHeight));
  const visibleHeight = Math.max(
    0,
    Math.round(measurement.visualViewportHeight ?? measurement.innerHeight),
  );
  const offsetTop = Math.max(0, Math.round(measurement.visualViewportOffsetTop ?? 0));
  const rawDifference = Math.max(0, layoutHeight - visibleHeight - offsetTop);
  const isKeyboardOpen = rawDifference >= KEYBOARD_OPEN_THRESHOLD_PX;

  return {
    layoutHeight,
    visibleHeight,
    offsetTop,
    keyboardHeight: isKeyboardOpen ? rawDifference : 0,
    isKeyboardOpen,
  };
}

export function getVisibleViewportHeight(measurement: ViewportMeasurement): number {
  return measureViewport(measurement).visibleHeight;
}

export function syncViewportCssVariables(
  stateOrMeasurement: ViewportState | ViewportMeasurement,
  target: CssVariableTarget,
): void {
  const state = 'layoutHeight' in stateOrMeasurement
    ? stateOrMeasurement
    : measureViewport(stateOrMeasurement);

  target.setProperty('--app-layout-height', `${state.layoutHeight}px`);
  target.setProperty('--app-viewport-height', `${state.visibleHeight}px`);
  target.setProperty('--app-viewport-offset-top', `${state.offsetTop}px`);
  target.setProperty('--keyboard-height', `${state.keyboardHeight}px`);
  target.setProperty('--keyboard-open', state.isKeyboardOpen ? '1' : '0');
}

function readViewportState(windowLike: Pick<ViewportWindowLike, 'innerHeight' | 'visualViewport'>): ViewportState {
  return measureViewport({
    innerHeight: windowLike.innerHeight,
    visualViewportHeight: windowLike.visualViewport?.height,
    visualViewportOffsetTop: windowLike.visualViewport?.offsetTop,
  });
}

export function installViewportHeightSync(
  root: HTMLElement = document.documentElement,
  onChange?: (state: ViewportState) => void,
  windowLike: ViewportWindowLike = window as unknown as ViewportWindowLike,
): () => void {
  let frameId: number | null = null;
  let disposed = false;

  const apply = () => {
    frameId = null;
    if (disposed) return;
    const state = readViewportState(windowLike);
    syncViewportCssVariables(state, root.style);
    onChange?.(state);
  };

  const schedule = () => {
    if (frameId !== null) return;
    if (windowLike.requestAnimationFrame) {
      frameId = windowLike.requestAnimationFrame(apply);
      return;
    }
    apply();
  };

  apply();
  windowLike.addEventListener('resize', schedule);
  windowLike.addEventListener('orientationchange', schedule);
  windowLike.visualViewport?.addEventListener('resize', schedule);
  windowLike.visualViewport?.addEventListener('scroll', schedule);

  return () => {
    disposed = true;
    windowLike.removeEventListener('resize', schedule);
    windowLike.removeEventListener('orientationchange', schedule);
    windowLike.visualViewport?.removeEventListener('resize', schedule);
    windowLike.visualViewport?.removeEventListener('scroll', schedule);
    if (frameId !== null && windowLike.cancelAnimationFrame) {
      windowLike.cancelAnimationFrame(frameId);
    }
    frameId = null;
  };
}
