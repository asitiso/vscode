import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
)
const homeSource = readFileSync(
  fileURLToPath(new URL('./HomeScreen.tsx', import.meta.url)),
  'utf8',
)
const setProgressCss = readFileSync(
  fileURLToPath(new URL('./CardSetProgress.css', import.meta.url)),
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

  it('uses slimmer horizontal capsules while preserving the enlarged icon and text sizes', () => {
    const badgeBlock = readClassBlock('hud-badge')
    const textBlock = readClassBlock('hud-badge__text')
    const iconBlock = readClassBlock('hud-badge__icon')
    const titleBlock = readClassBlock('hud-badge__title')
    const subtitleBlock = readClassBlock('hud-badge__subtitle')

    expect(badgeBlock).toMatch(/display:\s*flex;/)
    expect(badgeBlock).toMatch(/flex:\s*1\s+1\s+0;/)
    expect(badgeBlock).toMatch(/min-height:\s*clamp\(46px,\s*12vw,\s*50px\);/)
    expect(badgeBlock).toMatch(/border-radius:\s*999px;/)
    expect(textBlock).toMatch(/display:\s*flex;/)
    expect(textBlock).toMatch(/flex-direction:\s*column;/)
    expect(iconBlock).toMatch(/width:\s*clamp\(29px,\s*8vw,\s*32px\);/)
    expect(titleBlock).toMatch(/font-size:\s*clamp\(0\.78rem,\s*3\.25vw,\s*0\.88rem\);/)
    expect(subtitleBlock).toMatch(/font-size:\s*clamp\(0\.6rem,\s*2\.45vw,\s*0\.68rem\);/)
  })

  it('uses a home-scoped running background so the timer stays visible over the global HUD skin', () => {
    expect(css).toMatch(/\.home-screen\s+\.hud-badge--workout-running\s*\{[\s\S]*?background:\s*linear-gradient/)
  })

  it('keeps the central running timer legible with a dedicated elapsed-time pill', () => {
    const ctaTimeBlock = readClassBlock('home-screen__cta-time')

    expect(ctaTimeBlock).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.2\);/)
    expect(ctaTimeBlock).toMatch(/font-variant-numeric:\s*tabular-nums;/)
  })

  it('moves weekly progress into the streak HUD and removes the large weekly info panel', () => {
    expect(homeSource).toContain('<HomeWeeklyGoalControl')
    expect(homeSource).not.toContain('home-screen__info-panel')
  })

  it('keeps the center stack balanced after removing the weekly panel', () => {
    expect(setProgressCss).toMatch(/\.home-screen\s+\.home-screen__set-progress\s*\{\s*top:\s*19%;\s*\}/)
    expect(setProgressCss).toMatch(/\.home-screen\s+\.home-screen__cta\s*\{\s*top:\s*32\.5%;\s*\}/)
    expect(setProgressCss).toMatch(/\.home-screen\s+\.home-screen__character\s*\{\s*top:\s*49%;\s*\}/)
  })

  it('compresses the same center stack on short screens without changing its order', () => {
    const compact = setProgressCss.match(/@media\s*\(max-height:\s*720px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? ''

    expect(compact).toMatch(/\.home-screen\s+\.home-screen__set-progress\s*\{\s*top:\s*18%;\s*\}/)
    expect(compact).toMatch(/\.home-screen\s+\.home-screen__cta\s*\{\s*top:\s*31\.5%;\s*\}/)
    expect(compact).toMatch(/\.home-screen\s+\.home-screen__character\s*\{\s*top:\s*48%;\s*\}/)
  })

  it('does not keep the old floating circular workout timer position', () => {
    expect(css).not.toContain('left: 7%')
    expect(css).not.toContain('top: 48%')
  })
})
