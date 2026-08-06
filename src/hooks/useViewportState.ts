import { useEffect, useMemo, useState } from 'react';
import {
  installViewportHeightSync,
  measureViewport,
  type ViewportState,
} from '../utils/viewport';

function isEditableElement(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

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
  const [hasFocusedField, setHasFocusedField] = useState(false);

  useEffect(() => installViewportHeightSync(document.documentElement, setViewport), []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableElement(event.target)) setHasFocusedField(true);
    };
    const handleFocusOut = () => {
      window.setTimeout(() => setHasFocusedField(isEditableElement(document.activeElement)), 0);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return useMemo(() => {
    const focusedMobileField = typeof window !== 'undefined'
      && window.innerWidth <= 768
      && hasFocusedField;

    return {
      ...viewport,
      isKeyboardOpen: viewport.isKeyboardOpen || focusedMobileField,
    };
  }, [hasFocusedField, viewport]);
}
