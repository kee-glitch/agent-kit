import { describe, expect, it } from 'vitest'
import { parseAppRoute } from './canvasRoute'

describe('canvas route model', () => {
  it('routes the canvas entry directly to the retained canvas', () => {
    expect(parseAppRoute('#/canvas')).toEqual({ pageId: 'canvas' })
    expect(parseAppRoute('#/canvas/original')).toEqual({ pageId: 'canvas' })
  })

  it('falls back safely for malformed canvas children and keeps existing routes', () => {
    expect(parseAppRoute('#/canvas/unknown')).toEqual({ pageId: 'remake' })
    expect(parseAppRoute('#/remake')).toEqual({ pageId: 'remake' })
  })
})
