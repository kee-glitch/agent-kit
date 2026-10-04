import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import type { TaskEvent } from '../../services/contracts/canvasServices'
import { applyGenerationTaskEvent } from './runGenerationTask'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('task-canvas', now)
  snapshot.nodesById.result = { id: 'result', type: 'image', role: 'generated', name: '结果', position: { x: 0, y: 0 },
    locked: false, display: { width: 320, height: 260 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
    taskId: 'task', createdAt: now, updatedAt: now }
  snapshot.nodeOrder = ['result']
  snapshot.tasksById.task = { id: 'task', nodeId: 'result', sourceNodeId: 'source', resultNodeId: 'result', status: 'queued', attempt: 1,
    request: { contentType: 'image', prompt: '生成', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null }, createdAt: now, updatedAt: now }
  useCanvasSessionStore.setState({ snapshot, canUndo: false, canRedo: false })
})

describe('generation task event application', () => {
  it('updates_known_tasks_without_creating_history_and_attaches_completed_content', () => {
    const event: TaskEvent = { taskId: 'task', resultNodeId: 'result', status: 'completed', updatedAt: now,
      result: { versionId: 'version', content: '/fixtures/generated-image.svg' } }
    expect(applyGenerationTaskEvent(event)).toBe(true)
    const state = useCanvasSessionStore.getState()
    expect(state.snapshot.tasksById.task.status).toBe('completed')
    expect(state.snapshot.nodesById.result.currentVersionId).toBe('version')
    expect(state.snapshot.versionsById.version.content).toBe('/fixtures/generated-image.svg')
    expect(state.canUndo).toBe(false)
  })

  it('ignores_events_for_deleted_results_and_after_a_terminal_state', () => {
    useCanvasSessionStore.setState((state) => ({ snapshot: { ...state.snapshot, nodesById: {}, nodeOrder: [] } }))
    expect(applyGenerationTaskEvent({ taskId: 'task', resultNodeId: 'result', status: 'processing', updatedAt: now })).toBe(false)
  })
})
