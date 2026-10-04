import { getOperationDefinition, validateMediaOperation } from '../../domain/canvas/mediaOperations'
import { createEmptyNodeInput, getDefaultNodeDisplay } from '../../domain/canvas/migrateSnapshot'
import { layoutOperationResults } from '../../domain/canvas/resultLayout'
import type { CanvasGroup, CanvasTask, MediaOperation, MediaOperationRequest } from '../../domain/canvas/types'
import { createMockCanvasServices } from '../../services/mock/createMockCanvasServices'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { runMediaOperation } from '../tasks/runMediaOperation'

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export function startProcessing(sourceNodeId: string, operation: MediaOperation, prompt = '', scenario: 'success' | 'failure' = 'success') {
  const snapshot = useCanvasSessionStore.getState().snapshot
  const source = snapshot.nodesById[sourceNodeId]
  if (!source) return { ok: false as const, error: '来源节点不存在' }
  const definition = getOperationDefinition(operation)
  const requests: MediaOperationRequest[] = definition.outputTypes.map((outputType) => ({
    kind: 'media-operation', operation, sourceNodeId, outputType, prompt,
    range: definition.requiresRange ? { inPoint: 0, outPoint: Math.max(1, source.input?.media?.durationSeconds ?? 10) } : null,
    crop: definition.requiresCrop ? { x: 0, y: 0, width: 1, height: 1, aspectRatio: 'free', showSafeArea: false } : null,
    clipNodeIds: operation === 'splice' ? [sourceNodeId, ...snapshot.nodeOrder.filter((id) => id !== sourceNodeId && snapshot.nodesById[id].type === 'video').slice(0, 1)] : [],
    voiceTargetNodeId: source.input?.voiceTargetNodeId ?? null,
  }))
  return submitProcessingRequests(sourceNodeId, operation, requests, scenario)
}

function submitProcessingRequests(sourceNodeId: string, operation: MediaOperation, requests: MediaOperationRequest[], scenario: 'success' | 'failure', attempt = 1) {
  const snapshot = useCanvasSessionStore.getState().snapshot
  const source = snapshot.nodesById[sourceNodeId]
  if (!source) return { ok: false as const, error: '来源节点不存在' }
  const definition = getOperationDefinition(operation)
  const invalid = requests.map((request) => validateMediaOperation(snapshot, request)).find((result) => !result.ok)
  if (invalid && !invalid.ok) return invalid
  const now = new Date().toISOString()
  const branches = requests.map((request, index) => {
    const branchId = `${operation}-${index + 1}`, nodeId = uid('result'), taskId = uid('task')
    const task: CanvasTask = { id: taskId, nodeId, sourceNodeId, resultNodeId: nodeId, status: 'idle', attempt,
      request: { contentType: request.outputType, prompt: request.prompt, referenceNodeIds: [], voiceTargetNodeId: request.voiceTargetNodeId,
        generationConfig: null, operation: request, branchId }, createdAt: now, updatedAt: now }
    return { branchId, edgeId: uid('edge'), task, node: { id: nodeId, type: request.outputType, role: 'derived' as const,
      name: `${source.name} · ${definition.label}${requests.length > 1 ? ` ${index + 1}` : ''}`, position: { x: source.position.x + source.display.width + 120, y: source.position.y + index * 220 },
      locked: false, display: getDefaultNodeDisplay(request.outputType), input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
      taskId, createdAt: now, updatedAt: now } }
  })
  const positions = layoutOperationResults(source, branches.map((branch) => branch.node), snapshot.nodeOrder.map((id) => ({ ...snapshot.nodesById[id].position, ...snapshot.nodesById[id].display })))
  for (const branch of branches) branch.node.position = positions[branch.node.id]
  const group: CanvasGroup | null = definition.grouped && branches.length > 1 ? { id: uid('group'), name: `${definition.label}结果`, nodeIds: branches.map((branch) => branch.node.id), createdAt: now, updatedAt: now } : null
  const accepted = useCanvasSessionStore.getState().executeCommand({ type: 'submit-media-operation', sourceNodeId, operationLabel: definition.label, group, branches, now })
  if (!accepted) return { ok: false as const, error: '无法创建处理结果' }
  useCanvasInteractionStore.getState().replaceSelection(branches.map((branch) => branch.node.id))
  runMediaOperation(branches.map((branch) => ({ branchId: branch.branchId, taskId: branch.task.id, resultNodeId: branch.node.id, contentType: branch.node.type })), createMockCanvasServices(), Object.fromEntries(branches.map((branch) => [branch.branchId, scenario])))
  return { ok: true as const, taskIds: branches.map((branch) => branch.task.id) }
}

export function retryProcessingBranch(task: CanvasTask) {
  const request = task.request?.operation
  if (!task.sourceNodeId || !request) return { ok: false as const, error: '处理请求不存在' }
  return submitProcessingRequests(task.sourceNodeId, request.operation, [{ ...request }], 'success', (task.attempt ?? 1) + 1)
}
