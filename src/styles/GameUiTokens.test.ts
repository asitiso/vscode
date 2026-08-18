import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(
  fileURLToPath(new URL('./GameUiTokens.css', import.meta.url)),
  'utf8',
);
const primitives = readFileSync(
  fileURLToPath(new URL('./GameUiPrimitives.css', import.meta.url)),
  'utf8',
);

describe('game UI styles', () => {
  it('공통 게임 UI 토큰을 제공한다', () => {
    expect(tokens).toContain('--game-panel-radius');
    expect(tokens).toContain('--game-shadow-raised');
    expect(tokens).toContain('--game-accent-primary');
  });

  it('공통 패널과 버튼 프리미티브를 제공한다', () => {
    expect(primitives).toContain('.game-panel');
    expect(primitives).toContain('.game-button');
    expect(primitives).toContain('.game-gauge');
  });

  it('모션 감소 환경을 지원한다', () => {
    expect(primitives).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
