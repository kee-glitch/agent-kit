import type { CanvasSnapshot, RelationType } from './types'

export function validateConnection(snapshot: CanvasSnapshot, sourceId: string, targetId: string, relationType: RelationType): { ok: true } | { ok: false; reason: string } {
  if (!Object.hasOwn(snapshot.nodesById, sourceId) || !Object.hasOwn(snapshot.nodesById, targetId)) return { ok: false, reason: '连接节点已不存在' }
  if (sourceId === targetId) return { ok: false, reason: '节点不能连接自身' }
  if (snapshot.nodesById[sourceId].locked || snapshot.nodesById[targetId].locked) return { ok: false, reason: '锁定节点不能发起或接受连接' }
  if (relationType === 'instruction' && snapshot.nodesById[sourceId].type !== 'text') return { ok: false, reason: '指令关系需要文本来源节点' }
  if (Object.values(snapshot.edgesById).some((edge) => edge.sourceNodeId === sourceId && edge.targetNodeId === targetId && edge.relationType === relationType)) {
    return { ok: false, reason: '相同来源、目标和类型的关系已存在' }
  }
  return { ok: true }
}
