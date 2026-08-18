import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
)

function readClassBlock(className: string) {
  return css.match(new RegExp(`(?:^|\\n)\\.${className}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
}

describe('home HUD layout', () => {
  it('keeps level, group, workout, and streak badges in four equal columns on one row', () => {
    const panelBlock = readClassBlock('home-screen__top-panel')

    expect(panelBlock).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/)
    expect(panelBlock).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\);/)
    expect(panelBlock).toMatch(/grid-auto-flow:\s*column;/)
  })

  it('uses compact near-square capsules with a large icon/title row and full-width subtitle row', () => {
    const badgeBlock = readClassBlock('hud-badge')
    const iconBlock = readClassBlock('hud-badge__icon')
    const titleBlock = readClassBlock('hud-badge__title')
    const subtitleBlock = readClassBlock('hud-badge__subtitle')

    expect(badgeBlock).toMatch(/display:\s*grid;/)
    expect(badgeBlock).toMatch(/min-height:\s*clamp\(66px,\s*18vw,\s*72px\);/)
    expect(badgeBlock).toMatch(/grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\);/)
    expect(iconBlock).toMatch(/width:\s*clamp\(29px,\s*8vw,\s*32px\);/)
    expect(titleBlock).toMatch(/font-size:\s*clamp\(0\.78rem,\s*3\.25vw,\s*0\.88rem\);/)
    expect(subtitleBlock).toMatch(/grid-column:\s*1\s*\/\s*-1;/)
    expect(subtitleBlock).toMatch(/font-size:\s*clamp\(0\.6rem,\s*2\.45vw,\s*0\.68rem\);/)
  })

  it('does not keep the old floating circular workout timer position', () => {
    expect(css).not.toContain('left: 7%')
    expect(css).not.toContain('top: 48%')
  })
})
