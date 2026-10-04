import { getDefaultNodeDisplay, createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import type { CanvasTask, GenerationConfig, TaskRequestSnapshot } from '../../domain/canvas/types'
import { createMockCanvasServices } from '../../services/mock/createMockCanvasServices'
import type { TaskScenario } from '../../services/mock/taskScenarios'
import type { TaskHandle } from '../../services/contracts/canvasServices'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useLocalMediaStore } from '../../stores/useLocalMediaStore'
import { applyGenerationTaskEvent } from '../tasks/runGenerationTask'

const handles = new Map<string, TaskHandle>()

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function startGeneration(sourceNodeId: string, config: GenerationConfig, scenario: TaskScenario, requestOverride?: TaskRequestSnapshot, attempt = 1) {
  const snapshot = useCanvasSessionStore.getState().snapshot
  const source = snapshot.nodesById[sourceNodeId]
  if (!source || (source.type !== 'image' && source.type !== 'video')) return null
  const now = new Date().toISOString()
  const resultNodeId = id('result')
  const taskId = id('task')
  const request: TaskRequestSnapshot = requestOverride ?? {
    contentType: source.type,
    prompt: source.input?.prompt ?? '',
    referenceNodeIds: [...(source.input?.referenceNodeIds ?? [])],
    voiceTargetNodeId: source.input?.voiceTargetNodeId ?? null,
    generationConfig: { ...config },
  }
  const referenced = request.referenceNodeIds.map((nodeId) => snapshot.nodesById[nodeId])
  const voice = request.voiceTargetNodeId ? snapshot.nodesById[request.voiceTargetNodeId] : null
  const localReady = (nodeId: string) => {
    const node = snapshot.nodesById[nodeId]
    return node?.input?.media?.source !== 'local' || Boolean(useLocalMediaStore.getState().entries[nodeId])
  }
  if (request.contentType !== source.type || request.generationConfig?.kind !== source.type
    || referenced.some((node) => !node) || !localReady(sourceNodeId)
    || request.referenceNodeIds.some((nodeId) => !localReady(nodeId))
    || (request.voiceTargetNodeId && (!voice || voice.type !== 'audio' || !localReady(voice.id)))) return null
  const task: CanvasTask = { id: taskId, nodeId: resultNodeId, sourceNodeId, resultNodeId, request, attempt,
    status: 'idle', createdAt: now, updatedAt: now }
  const accepted = useCanvasSessionStore.getState().executeCommand({ type: 'submit-generation', now, edgeId: id('edge'), task,
    resultNode: { id: resultNodeId, type: source.type, role: 'generated', name: `${source.name} · 生成结果`, locked: false,
      position: { x: source.position.x + source.display.width + 120, y: source.position.y }, display: getDefaultNodeDisplay(source.type),
      versionIds: [], currentVersionId: null, taskId, input: createEmptyNodeInput(), createdAt: now, updatedAt: now } })
  if (!accepted) return null
  useCanvasInteractionStore.getState().replaceSelection([resultNodeId])
  const handle = createMockCanvasServices({ scenario }).tasks.generation.start({ taskId, resultNodeId, contentType: source.type, request }, (event) => {
    applyGenerationTaskEvent(event)
    if (['completed', 'failed', 'cancelled'].includes(event.status)) handles.delete(taskId)
  })
  handles.set(taskId, handle)
  return taskId
}

export function cancelGeneration(taskId: string) {
  handles.get(taskId)?.cancel()
  handles.delete(taskId)
}
