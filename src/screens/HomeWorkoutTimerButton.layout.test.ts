import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
);

describe('home workout timer layout', () => {
  it('기록 버튼 아래 왼쪽 운동 공간에 원형 타이머 버튼을 배치한다', () => {
    expect(styles).toContain('.home-screen__workout-timer');
    expect(styles).toContain('left: 7%');
    expect(styles).toContain('top: 48%');
    expect(styles).toContain('border-radius: 50%');
  });
});
