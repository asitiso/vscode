import { useEffect, type RefObject } from 'react';

const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const EDGE_GAP_PX = 20;
const KEYBOARD_THRESHOLD_PX = 160;

function isEditableField(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(FIELD_SELECTOR);
}

export function useFocusedFieldVisibility(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: number | null = null;

    const revealFocusedField = (target: HTMLElement) => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      if (document.body.style.overflow === 'hidden') return;

      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      if (keyboardHeight < KEYBOARD_THRESHOLD_PX) return;

      const rect = target.getBoundingClientRect();
      const visibleTop = viewport.offsetTop + EDGE_GAP_PX;
      const visibleBottom = viewport.offsetTop + viewport.height - EDGE_GAP_PX;
      if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableField(event.target)) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => revealFocusedField(event.target as HTMLElement), 180);
    };

    container.addEventListener('focusin', handleFocusIn);
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [containerRef]);
}
