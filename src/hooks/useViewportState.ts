import { useEffect, useState } from 'react';
import {
  installViewportHeightSync,
  measureViewport,
  type ViewportState,
} from '../utils/viewport';

function getInitialViewportState(): ViewportState {
  if (typeof window === 'undefined') {
    return {
      layoutHeight: 0,
      visibleHeight: 0,
      offsetTop: 0,
      keyboardHeight: 0,
      isKeyboardOpen: false,
    };
  }

  return measureViewport({
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height,
    visualViewportOffsetTop: window.visualViewport?.offsetTop,
  });
}

export function useViewportState(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(getInitialViewportState);

  useEffect(() => installViewportHeightSync(document.documentElement, setViewport), []);

  return viewport;
}
