import { describe, expect, it } from 'vitest'
import { canvasThemeHash, parseAppRoute } from './canvasRoute'

describe('canvas route model', () => {
  it('keeps the canvas landing route theme-neutral', () => {
    expect(parseAppRoute('#/canvas')).toEqual({ pageId: 'canvas', canvasTheme: null })
  })

  it('recognizes the two explicit canvas themes', () => {
    expect(parseAppRoute('#/canvas/original')).toEqual({ pageId: 'canvas', canvasTheme: 'original' })
    expect(parseAppRoute('#/canvas/shulan')).toEqual({ pageId: 'canvas', canvasTheme: 'shulan' })
    expect(canvasThemeHash('original')).toBe('#/canvas/original')
    expect(canvasThemeHash('shulan')).toBe('#/canvas/shulan')
  })

  it('falls back safely for malformed canvas children and keeps existing routes', () => {
    expect(parseAppRoute('#/canvas/unknown')).toEqual({ pageId: 'remake', canvasTheme: null })
    expect(parseAppRoute('#/remake')).toEqual({ pageId: 'remake', canvasTheme: null })
  })
})
