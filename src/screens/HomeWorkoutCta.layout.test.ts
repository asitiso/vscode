import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
);

describe('home workout CTA styling', () => {
  it('keeps the primary start button large and gives the running state a distinct purple treatment', () => {
    const base = css.match(/\.home-screen__cta\s*\{([^}]*)\}/)?.[1] ?? '';
    const running = css.match(/\.home-screen__cta--running\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(base).toMatch(/height:\s*clamp\(54px,\s*14vw,\s*62px\);/);
    expect(base).toMatch(/font-size:\s*clamp\(1rem,\s*4vw,\s*1\.15rem\);/);
    expect(running).toContain('linear-gradient(180deg, #8f7cf2 0%, #6f49d8 58%, #5730b8 100%)');
    expect(running).toContain('border-bottom: 4px solid #45269b');
    expect(running).toContain('box-shadow: 0 7px 18px rgba(91, 67, 201, 0.42)');
  });
});
