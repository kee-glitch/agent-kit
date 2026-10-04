import type { CanvasNodeEntity, CanvasSnapshot } from './types'

export function layoutCanvas(snapshot: CanvasSnapshot): Record<string, CanvasNodeEntity['position']> {
  const { nodeOrder, nodesById } = snapshot
  const remaining = new Set(nodeOrder)
  const outgoing = new Map(nodeOrder.map((id) => [id, new Set<string>()]))
  const incoming = new Map(nodeOrder.map((id) => [id, 0]))
  const levels = new Map(nodeOrder.map((id) => [id, 0]))
  for (const edge of Object.values(snapshot.edgesById)) {
    const targets = outgoing.get(edge.sourceNodeId)
    if (!targets || !remaining.has(edge.targetNodeId) || edge.sourceNodeId === edge.targetNodeId
      || targets.has(edge.targetNodeId)) continue
    targets.add(edge.targetNodeId)
    incoming.set(edge.targetNodeId, incoming.get(edge.targetNodeId)! + 1)
  }

  while (remaining.size > 0) {
    // A cycle has no root: ignore incoming edges at the first remaining ordered node.
    const id = nodeOrder.find((candidate) => remaining.has(candidate) && incoming.get(candidate) === 0)
      ?? nodeOrder.find((candidate) => remaining.has(candidate))!
    remaining.delete(id)
    for (const target of outgoing.get(id)!) {
      if (!remaining.has(target)) continue
      levels.set(target, Math.max(levels.get(target)!, levels.get(id)! + 1))
      incoming.set(target, incoming.get(target)! - 1)
    }
  }

  const positions = new Map<string, CanvasNodeEntity['position']>()
  let x = 0
  const lastLevel = Math.max(-1, ...levels.values())
  for (let level = 0; level <= lastLevel; level++) {
    const ids = nodeOrder.filter((id) => levels.get(id) === level)
    let y = 0
    let width = 0
    for (const id of ids) {
      positions.set(id, { x, y })
      y += nodesById[id].display.height + 80
      width = Math.max(width, nodesById[id].display.width)
    }
    x += width + 120
  }
  return Object.fromEntries(positions)
}
