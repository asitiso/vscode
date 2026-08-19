import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const homeSource = readFileSync(fileURLToPath(new URL('./HomeScreen.tsx', import.meta.url)), 'utf8');
const weeklySource = readFileSync(fileURLToPath(new URL('./HomeWeeklyGoalControl.tsx', import.meta.url)), 'utf8');
const sharedCss = readFileSync(fileURLToPath(new URL('./HomeHudPopover.css', import.meta.url)), 'utf8');

function readBlock(css: string, className: string) {
  return css.match(new RegExp(`(?:^|\\n)\\.${className}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
}

describe('home HUD popovers', () => {
  it('uses one shared geometry and surface for level and weekly detail panels', () => {
    const popover = readBlock(sharedCss, 'home-hud-popover');

    expect(popover).toMatch(/top:\s*calc\(100%\s*\+\s*9px\);/);
    expect(popover).toMatch(/width:\s*min\(76vw,\s*286px\);/);
    expect(popover).toMatch(/padding:\s*14px;/);
    expect(popover).toMatch(/border-radius:\s*20px;/);
    expect(popover).toMatch(/box-shadow:\s*0\s+14px\s+34px/);
  });

  it('anchors the level popover left and weekly popover right with the shared class', () => {
    expect(homeSource).toContain('home-hud-popover home-hud-popover--left level-xp-popover');
    expect(weeklySource).toContain('home-hud-popover home-hud-popover--right weekly-goal-popover');
  });
});
