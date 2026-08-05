export interface ViewportMeasurement {
  innerHeight: number;
  visualViewportHeight?: number;
}

interface CssVariableTarget {
  setProperty: (name: string, value: string) => void;
}

export function getVisibleViewportHeight(measurement: ViewportMeasurement): number {
  return Math.round(measurement.visualViewportHeight ?? measurement.innerHeight);
}

export function syncViewportCssVariables(
  measurement: ViewportMeasurement,
  target: CssVariableTarget,
): void {
  target.setProperty('--app-viewport-height', `${getVisibleViewportHeight(measurement)}px`);
}

export function installViewportHeightSync(root: HTMLElement = document.documentElement): () => void {
  const update = () => {
    syncViewportCssVariables(
      {
        innerHeight: window.innerHeight,
        visualViewportHeight: window.visualViewport?.height,
      },
      root.style,
    );
  };

  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);

  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
  };
}
