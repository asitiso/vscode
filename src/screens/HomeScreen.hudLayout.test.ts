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
  it('keeps all four HUD capsules on one flex row without wrapping', () => {
    const panelBlock = readClassBlock('home-screen__top-panel')

    expect(panelBlock).toMatch(/display:\s*flex;/)
    expect(panelBlock).toMatch(/flex-wrap:\s*nowrap;/)
    expect(panelBlock).toMatch(/align-items:\s*stretch;/)
  })

  it('uses horizontal flex capsules while preserving the enlarged icon and text sizes', () => {
    const badgeBlock = readClassBlock('hud-badge')
    const textBlock = readClassBlock('hud-badge__text')
    const iconBlock = readClassBlock('hud-badge__icon')
    const titleBlock = readClassBlock('hud-badge__title')
    const subtitleBlock = readClassBlock('hud-badge__subtitle')

    expect(badgeBlock).toMatch(/display:\s*flex;/)
    expect(badgeBlock).toMatch(/flex:\s*1\s+1\s+0;/)
    expect(badgeBlock).toMatch(/min-height:\s*clamp\(54px,\s*14vw,\s*60px\);/)
    expect(badgeBlock).toMatch(/border-radius:\s*999px;/)
    expect(textBlock).toMatch(/display:\s*flex;/)
    expect(textBlock).toMatch(/flex-direction:\s*column;/)
    expect(iconBlock).toMatch(/width:\s*clamp\(29px,\s*8vw,\s*32px\);/)
    expect(titleBlock).toMatch(/font-size:\s*clamp\(0\.78rem,\s*3\.25vw,\s*0\.88rem\);/)
    expect(subtitleBlock).toMatch(/font-size:\s*clamp\(0\.6rem,\s*2\.45vw,\s*0\.68rem\);/)
  })

  it('does not keep the old floating circular workout timer position', () => {
    expect(css).not.toContain('left: 7%')
    expect(css).not.toContain('top: 48%')
  })
})
