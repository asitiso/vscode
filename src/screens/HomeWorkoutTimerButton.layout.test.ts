import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
);

describe('home workout timer layout', () => {
  it('상단 HUD 안에서 그룹과 연속 배지 사이에 맞는 캡슐 스타일을 사용한다', () => {
    expect(styles).toContain('.hud-badge--workout');
    expect(styles).not.toContain('left: 7%');
    expect(styles).not.toContain('top: 48%');
  });
});
