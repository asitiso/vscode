import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  fileURLToPath(new URL('./GroupScreens.css', import.meta.url)),
  'utf8',
);

describe('group screen layout', () => {
  it('하단 네비와 safe area에 가려지지 않도록 콘텐츠 여백을 확보한다', () => {
    expect(styles).toContain('var(--app-bottom-nav-height,78px)');
    expect(styles).toContain('env(safe-area-inset-bottom)');
  });
});
