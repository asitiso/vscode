import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const screens = readFileSync(
  fileURLToPath(new URL('./GameUiScreens.css', import.meta.url)),
  'utf8',
);

describe('screen game UI polish', () => {
  it('covers all primary app screens', () => {
    expect(screens).toContain('.home-screen');
    expect(screens).toContain('.record-screen');
    expect(screens).toContain('.collection-screen');
    expect(screens).toContain('.rewards-screen');
    expect(screens).toContain('.settings-screen');
    expect(screens).toContain('.workout-report-screen');
    expect(screens).toContain('.exercise-analysis-screen');
    expect(screens).toContain('.combo-pack-opening-screen');
  });

  it('keeps small-screen and reduced-motion fallbacks', () => {
    expect(screens).toContain('@media (max-width: 350px)');
    expect(screens).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('uses the shared game design tokens', () => {
    expect(screens).toContain('var(--game-panel-border)');
    expect(screens).toContain('var(--game-shadow-raised)');
    expect(screens).toContain('var(--game-control-radius)');
  });
});
