import { describe, expect, it } from 'vitest'
import { layoutCanvas } from './autoLayout'
import { createEmptySnapshot } from './createEmptySnapshot'
import type { CanvasNodeEntity, CanvasSnapshot } from './types'

const now = '2026-10-04T00:00:00.000Z'
function graph(ids: string[], links: [string, string][] = []): CanvasSnapshot {
  const nodesById: Record<string, CanvasNodeEntity> = {}
  for (const id of ids) nodesById[id] = { id, type: 'text', role: 'blank', name: id,
    position: { x: 900, y: 900 }, versionIds: [], currentVersionId: null, taskId: null,
    createdAt: now, updatedAt: now, locked: false, display: { width: 280, height: 180 } }
  const edges = links.map(([sourceNodeId, targetNodeId], i) => ({ id: `e${i}`, sourceNodeId, targetNodeId, relationType: 'reference' as const, sourceVersionId: null }))
  return { ...createEmptySnapshot('canvas', now), nodesById, nodeOrder: ids,
    edgesById: Object.fromEntries(edges.map((edge) => [edge.id, edge])), edgeOrder: edges.map((edge) => edge.id) }
}

describe('deterministic canvas layout', () => {
  it('returns_empty_layout_for_empty_canvas', () => expect(layoutCanvas(graph([]))).toEqual({}))
  it('orders_unconnected_nodes_by_node_order_with_vertical_gap_80', () => {
    const snapshot = graph(['z', 'a', 'b'])
    snapshot.nodesById.a.display.height = 260
    expect(layoutCanvas(snapshot)).toEqual({ z: { x: 0, y: 0 }, a: { x: 0, y: 260 }, b: { x: 0, y: 600 } })
  })
  it('follows_edge_direction_and_uses_layer_width_plus_horizontal_gap_120', () => {
    const snapshot = graph(['c', 'b', 'a', 'd'], [['a', 'b'], ['b', 'c'], ['a', 'd']])
    snapshot.nodesById.b.display.width = 360
    const before = JSON.stringify(snapshot)
    expect(layoutCanvas(snapshot)).toEqual({ a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, d: { x: 400, y: 260 }, c: { x: 880, y: 0 } })
    expect(layoutCanvas(snapshot)).toEqual(layoutCanvas(snapshot))
    expect(JSON.stringify(snapshot)).toBe(before)
  })
  it('breaks_cycles_at_first_remaining_node_in_node_order', () => {
    const snapshot = graph(['b', 'a', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']])
    expect(layoutCanvas(snapshot)).toEqual({ b: { x: 0, y: 0 }, c: { x: 400, y: 0 }, a: { x: 800, y: 0 } })
    const reversedMaps = { ...snapshot, nodesById: Object.fromEntries(Object.entries(snapshot.nodesById).reverse()), edgesById: Object.fromEntries(Object.entries(snapshot.edgesById).reverse()), edgeOrder: [...snapshot.edgeOrder].reverse() }
    expect(layoutCanvas(reversedMaps)).toEqual(layoutCanvas(snapshot))
  })
  it('handles_self_cycles_and_ignores_edges_to_missing_nodes', () => {
    expect(layoutCanvas(graph(['a', 'b'], [['a', 'a'], ['a', 'missing']]))).toEqual({ a: { x: 0, y: 0 }, b: { x: 0, y: 260 } })
  })
  it('lays_out_nodes_with_dictionary_prototype_names', () => {
    const snapshot = graph(['__proto__', 'toString'])
    snapshot.nodesById = Object.fromEntries(snapshot.nodeOrder.map((id) => [id, { ...snapshot.nodesById[id] }]))
    const result = layoutCanvas(snapshot)
    expect(Object.keys(result)).toEqual(['__proto__', 'toString'])
    expect(result.__proto__).toEqual({ x: 0, y: 0 })
    expect(result.toString).toEqual({ x: 0, y: 260 })
  })
})
