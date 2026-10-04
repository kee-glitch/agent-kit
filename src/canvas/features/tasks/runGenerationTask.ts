import type { TaskEvent } from '../../services/contracts/canvasServices'
import { commitTaskSnapshot, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

const terminal = new Set(['completed', 'failed', 'cancelled', 'source-missing', 'interrupted'])

export function applyGenerationTaskEvent(event: TaskEvent): boolean {
  const snapshot = useCanvasSessionStore.getState().snapshot
  const task = snapshot.tasksById[event.taskId]
  const node = snapshot.nodesById[event.resultNodeId]
  if (!task || !node || task.resultNodeId !== event.resultNodeId || terminal.has(task.status)) return false
  const tasksById = { ...snapshot.tasksById, [task.id]: { ...task, status: event.status, updatedAt: event.updatedAt,
    ...(event.error ? { error: event.error } : { error: undefined }) } }
  let next = { ...snapshot, tasksById, canvas: { ...snapshot.canvas, updatedAt: event.updatedAt } }
  if (event.status === 'completed' && event.result) {
    const version = { id: event.result.versionId, nodeId: node.id, createdAt: event.updatedAt, content: event.result.content }
    next = {
      ...next,
      nodesById: { ...next.nodesById, [node.id]: { ...node, versionIds: [...node.versionIds, version.id], currentVersionId: version.id, updatedAt: event.updatedAt } },
      versionsById: { ...next.versionsById, [version.id]: version },
      versionOrder: [...next.versionOrder, version.id],
    }
  }
  commitTaskSnapshot(next)
  return true
}
