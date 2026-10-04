import { describe, expect, it } from 'vitest'
import { layoutOperationResults } from './resultLayout'

describe('operation result layout', () => {
  const source = { position: { x: 100, y: 200 }, display: { width: 360, height: 260 } }
  it('places_single_and_split_results_without_moving_the_source', () => {
    const before = structuredClone(source)
    expect(layoutOperationResults(source, [{ id: 'a', display: { width: 320, height: 260 } }], [])).toEqual({ a: { x: 580, y: 200 } })
    expect(layoutOperationResults(source, [{ id: 'a', display: { width: 320, height: 260 } }, { id: 'b', display: { width: 320, height: 180 } }], [])).toEqual({ a: { x: 580, y: 200 }, b: { x: 580, y: 540 } })
    expect(source).toEqual(before)
  })
  it('wraps_frame_grids_and_avoids_occupied_rectangles_deterministically', () => {
    const results = [1, 2, 3, 4].map((n) => ({ id: String(n), display: { width: 320, height: 260 } }))
    const positions = layoutOperationResults(source, results, [{ x: 580, y: 200, width: 320, height: 260 }])
    expect(positions).toEqual({ '1': { x: 940, y: 200 }, '2': { x: 1300, y: 200 }, '3': { x: 940, y: 540 }, '4': { x: 1300, y: 540 } })
  })
  it('checks_every_occupied_rectangle_not_only_the_first', () => {
    const positions = layoutOperationResults(source, [{ id: 'a', display: { width: 320, height: 260 } }], [
      { x: 0, y: 0, width: 10, height: 10 }, { x: 580, y: 200, width: 320, height: 260 },
    ])
    expect(positions.a).toEqual({ x: 940, y: 200 })
  })
})
