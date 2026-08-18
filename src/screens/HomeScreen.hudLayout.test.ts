import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
)

describe('home HUD layout', () => {
  it('keeps level, group, and streak badges at equal widths', () => {
    expect(css).toMatch(
      /\.home-screen__top-panel\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
    )
  })

  it('does not override the three equal columns on narrow screens', () => {
    const narrowBlock = css.match(/@media \(max-width: 390px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

    expect(narrowBlock).not.toMatch(/grid-template-columns:/)
  })
})
