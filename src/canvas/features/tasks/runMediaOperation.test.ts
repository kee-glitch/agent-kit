import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { createMockCanvasServices } from '../../services/mock/createMockCanvasServices'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { cancelMediaOperationBranch, runMediaOperation } from './runMediaOperation'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('canvas', now)
  for (const [id, type, taskId] of [['video-result', 'video', 'task-video'], ['audio-result', 'audio', 'task-audio']] as const) {
    snapshot.nodesById[id] = { id, type, role: 'derived', name: id, position: { x: 0, y: 0 }, locked: false,
      display: { width: 320, height: 200 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
      taskId, createdAt: now, updatedAt: now }
    snapshot.nodeOrder.push(id)
    snapshot.tasksById[taskId] = { id: taskId, nodeId: id, sourceNodeId: 'source', resultNodeId: id, status: 'queued', attempt: 1,
      request: { contentType: type, prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null, branchId: type }, createdAt: now, updatedAt: now }
  }
  useCanvasSessionStore.setState({ snapshot })
})

describe('media operation orchestration', () => {
  it('completes_each_branch_with_a_stable_type_specific_fixture', () => {
    runMediaOperation([
      { branchId: 'video', taskId: 'task-video', resultNodeId: 'video-result', contentType: 'video' },
      { branchId: 'audio', taskId: 'task-audio', resultNodeId: 'audio-result', contentType: 'audio' },
    ], createMockCanvasServices(), { video: 'success', audio: 'success' })
    vi.runAllTimers()
    const snapshot = useCanvasSessionStore.getState().snapshot
    expect(snapshot.tasksById['task-video'].status).toBe('completed')
    expect(snapshot.tasksById['task-audio'].status).toBe('completed')
    expect(snapshot.versionsById['task-video-version'].content).toBe('/fixtures/processed-video-poster.svg')
    expect(snapshot.versionsById['task-audio-version'].content).toBe('/fixtures/generated-audio-waveform.svg')
  })

  it('keeps_successful_siblings_when_one_branch_fails_or_is_cancelled', () => {
    runMediaOperation([
      { branchId: 'video', taskId: 'task-video', resultNodeId: 'video-result', contentType: 'video' },
      { branchId: 'audio', taskId: 'task-audio', resultNodeId: 'audio-result', contentType: 'audio' },
    ], createMockCanvasServices(), { video: 'success', audio: 'failure' })
    cancelMediaOperationBranch('task-audio')
    vi.runAllTimers()
    expect(useCanvasSessionStore.getState().snapshot.tasksById['task-video'].status).toBe('completed')
    expect(useCanvasSessionStore.getState().snapshot.tasksById['task-audio'].status).toBe('cancelled')
  })
})
