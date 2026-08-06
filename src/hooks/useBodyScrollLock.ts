import { useEffect } from 'react';

let lockCount = 0;
let lockedScrollY = 0;
let previousStyles: Partial<CSSStyleDeclaration> | null = null;

function lockBody(): void {
  if (lockCount === 0) {
    lockedScrollY = window.scrollY;
    previousStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBody(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !previousStyles) return;

  document.body.style.position = previousStyles.position ?? '';
  document.body.style.top = previousStyles.top ?? '';
  document.body.style.left = previousStyles.left ?? '';
  document.body.style.right = previousStyles.right ?? '';
  document.body.style.width = previousStyles.width ?? '';
  document.body.style.overflow = previousStyles.overflow ?? '';
  previousStyles = null;
  window.scrollTo(0, lockedScrollY);
}

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    lockBody();
    return unlockBody;
  }, [isLocked]);
}
