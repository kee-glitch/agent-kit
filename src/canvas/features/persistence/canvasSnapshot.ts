import type { CanvasSnapshot } from '../../domain/canvas/types'
import { createEmptyNodeInput, isPersistableContent, migrateCanvasSnapshot } from '../../domain/canvas/migrateSnapshot'
import type { SnapshotParseResult } from '../../domain/canvas/migrateSnapshot'

export type { SnapshotParseResult } from '../../domain/canvas/migrateSnapshot'

export const CANVAS_STORAGE_KEY = 'maolong-canvas:snapshot'
export const CANVAS_QUARANTINE_KEY = 'maolong-canvas:quarantine'

export type SnapshotLoadResult = SnapshotParseResult & { hadStoredValue: boolean; canPersist: boolean }

export function parseCanvasSnapshot(raw: string, fallback: CanvasSnapshot): SnapshotParseResult {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { status: 'recovered', snapshot: fallback, reason: 'corrupt-json' }
  }
  return migrateCanvasSnapshot(value, fallback)
}

export function loadCanvasSnapshot(storage: Storage, fallback: CanvasSnapshot): SnapshotLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(CANVAS_STORAGE_KEY)
  } catch {
    return { status: 'loaded', snapshot: fallback, hadStoredValue: false, canPersist: false }
  }
  if (raw === null) return { status: 'loaded', snapshot: fallback, hadStoredValue: false, canPersist: true }

  const result = parseCanvasSnapshot(raw, fallback)
  if (result.status === 'recovered') {
    try {
      // A failed quarantine must block later edits from replacing the only original.
      storage.setItem(CANVAS_QUARANTINE_KEY, raw)
    } catch {
      return { ...result, hadStoredValue: true, canPersist: false }
    }
    try {
      saveCanvasSnapshot(storage, fallback)
    } catch {
      // The original is quarantined, so a later user edit can safely retry saving.
    }
  }
  return { ...result, hadStoredValue: true, canPersist: true }
}

export function saveCanvasSnapshot(storage: Storage, snapshot: CanvasSnapshot): void {
  const nodesById = Object.fromEntries(Object.entries(snapshot.nodesById).map(([id, node]) => [
    id,
    'input' in node ? node : { ...node, input: createEmptyNodeInput() },
  ])) as CanvasSnapshot['nodesById']
  const tasksById = Object.fromEntries(Object.entries(snapshot.tasksById).map(([id, task]) => {
    if ('request' in task) return [id, task]
    const node = nodesById[task.nodeId]
    return [id, {
      ...task,
      status: task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'
        || task.status === 'source-missing' || task.status === 'interrupted' ? task.status : 'interrupted',
      sourceNodeId: task.nodeId,
      resultNodeId: task.nodeId,
      request: {
        contentType: node?.type ?? 'text', prompt: node?.input?.prompt ?? '', referenceNodeIds: [],
        voiceTargetNodeId: null, generationConfig: null,
      },
      attempt: 1,
    }]
  })) as CanvasSnapshot['tasksById']
  const versionsById = Object.fromEntries(Object.entries(snapshot.versionsById).map(([id, version]) => [
    id,
    isPersistableContent(version.content, snapshot.nodesById[version.nodeId])
      ? version
      : { ...version, content: null },
  ]))
  storage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ ...snapshot, nodesById, tasksById, versionsById }))
}
