import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('./HomeScreen.css', import.meta.url)),
  'utf8',
)

describe('home HUD layout', () => {
  it('keeps level, group, workout, and streak badges in four equal columns', () => {
    expect(css).toMatch(
      /\.home-screen__top-panel\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/,
    )
  })

  it('does not keep the old floating circular workout timer position', () => {
    expect(css).not.toContain('left: 7%')
    expect(css).not.toContain('top: 48%')
  })
})
