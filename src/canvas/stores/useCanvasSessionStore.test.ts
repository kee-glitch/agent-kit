// @vitest-environment-options {"storageQuota":1024}
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CANVAS_QUARANTINE_KEY, CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../features/persistence/canvasSnapshot'
import { createEmptySnapshot } from '../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../domain/canvas/migrateSnapshot'
import { commitTaskSnapshot, executeCommand, hydrateCanvasSession, markSaved, redo, renameCanvas, selectCanRedo, selectCanUndo, undo, updateViewport, useCanvasSessionStore } from './useCanvasSessionStore'
import type { CanvasCommand } from '../domain/canvas/canvasCommands'
import type { CanvasNodeEntityV3 } from '../domain/canvas/types'

const now = '2026-10-04T00:00:00.000Z'
const edits = [
  ['title', () => renameCanvas('内存编辑'), (snapshot: ReturnType<typeof createEmptySnapshot>) => {
    expect(snapshot.canvas.name).toBe('内存编辑')
  }],
  ['viewport', () => updateViewport({ x: 10, y: 20, zoom: 0.75 }), (snapshot: ReturnType<typeof createEmptySnapshot>) => {
    expect(snapshot.viewport).toEqual({ x: 10, y: 20, zoom: 0.75 })
  }],
] as const

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('canvas session preservation across edits', () => {
  for (const [kind, raw] of [
    ['future', JSON.stringify({ schemaVersion: 4, payload: 'x'.repeat(650) })],
    ['corrupt', `{${'x'.repeat(650)}`],
  ]) {
    it.each(edits)(`keeps_the_only_${kind}_snapshot_after_quota_failure_and_%s_edit`, (_edit, commit, assertEdit) => {
      // Both values fit the real Storage alone; only the quarantine copy exceeds its quota.
      saveCanvasSnapshot(localStorage, createEmptySnapshot('local-canvas', now))
      localStorage.setItem(CANVAS_STORAGE_KEY, raw)
      expect(() => localStorage.setItem(CANVAS_QUARANTINE_KEY, raw)).toThrow()
      hydrateCanvasSession(localStorage, now)
      expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(raw)
      expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBeNull()
      expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')

      commit()

      assertEdit(useCanvasSessionStore.getState().snapshot)
      expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(raw)
      expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBeNull()
      expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
    })
  }

  it.each([
    ['future', '{"schemaVersion":4}'],
    ['corrupt', '{broken'],
  ])('persists_edits_after_safely_quarantining_a_%s_snapshot', (_kind, raw) => {
    localStorage.setItem(CANVAS_STORAGE_KEY, raw)
    hydrateCanvasSession(localStorage, now)

    renameCanvas('恢复后保存')
    updateViewport({ x: -12, y: 34, zoom: 0.5 })

    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBe(raw)
    const stored = JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!)
    expect(stored.canvas.name).toBe('恢复后保存')
    expect(stored.viewport).toEqual({ x: -12, y: 34, zoom: 0.5 })
    expect(useCanvasSessionStore.getState().saveStatus).toBe('saved')
  })

  it('does_not_mark_unreadable_storage_as_saved', () => {
    const storage = { getItem: () => { throw new Error('Blocked read') } } as unknown as Storage
    hydrateCanvasSession(storage, now)
    markSaved()
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
  })

  it('allows_later_edits_when_quarantine_succeeded_but_the_initial_replacement_failed', () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, '{broken')
    let failReplacement = true
    const storage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        if (key === CANVAS_STORAGE_KEY && failReplacement) throw new Error('Temporary write failure')
        localStorage.setItem(key, value)
      },
    } as unknown as Storage
    hydrateCanvasSession(storage, now)
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBe('{broken')
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe('{broken')
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')

    failReplacement = false
    renameCanvas('后续保存')

    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).canvas.name).toBe('后续保存')
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBe('{broken')
    expect(useCanvasSessionStore.getState().saveStatus).toBe('saved')
  })

  it('reinitializes_persistence_only_after_a_later_safe_read', () => {
    const snapshot = createEmptySnapshot('preserved', now)
    saveCanvasSnapshot(localStorage, snapshot)
    const original = localStorage.getItem(CANVAS_STORAGE_KEY)
    let blockedRead = true
    const storage = {
      getItem: (key: string) => {
        if (blockedRead) throw new Error('Blocked read')
        return localStorage.getItem(key)
      },
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
    } as unknown as Storage
    hydrateCanvasSession(storage, now)
    renameCanvas('未保存编辑')
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(original)
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')

    blockedRead = false
    hydrateCanvasSession(storage, now)
    renameCanvas('读取恢复后保存')
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).canvas.name).toBe('读取恢复后保存')
    expect(useCanvasSessionStore.getState().saveStatus).toBe('saved')
  })
})

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) } }
}

function createNode(id: string): Extract<CanvasCommand, { type: 'create-node' }> {
  const entity: CanvasNodeEntityV3 = { id, type: 'text', role: 'blank', name: id, position: { x: 10, y: 20 },
    versionIds: [], currentVersionId: null, taskId: null, locked: false, display: { width: 280, height: 180 },
    input: createEmptyNodeInput(),
    createdAt: now, updatedAt: now }
  return { type: 'create-node', node: entity }
}

describe('canvas command session history', () => {
  it('preserves_a_later_task_result_when_undoing_an_earlier_move', () => {
    hydrateCanvasSession(memoryStorage(), now)
    executeCommand(createNode('source'))
    const result = { ...createNode('result').node, type: 'image' as const, role: 'generated' as const, taskId: 'task' }
    executeCommand({ type: 'submit-generation', now, edgeId: 'derived', resultNode: result, task: {
      id: 'task', nodeId: 'result', sourceNodeId: 'source', resultNodeId: 'result', status: 'queued', attempt: 1,
      request: { contentType: 'image', prompt: 'x', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null }, createdAt: now, updatedAt: now,
    } })
    executeCommand({ type: 'move-nodes', positions: { source: { x: 40, y: 50 } }, now })
    const current = useCanvasSessionStore.getState().snapshot
    commitTaskSnapshot({ ...current,
      nodesById: { ...current.nodesById, result: { ...current.nodesById.result, versionIds: ['version'], currentVersionId: 'version' } },
      versionsById: { version: { id: 'version', nodeId: 'result', content: '/fixtures/generated-image.svg', createdAt: now } }, versionOrder: ['version'],
      tasksById: { task: { ...current.tasksById.task, status: 'completed' } },
    })
    expect(undo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot.nodesById.result.currentVersionId).toBe('version')
    expect(useCanvasSessionStore.getState().snapshot.tasksById.task.status).toBe('completed')
  })
  it('stores_one_entry_and_one_write_for_a_multi_node_move', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    executeCommand(createNode('a'))
    executeCommand(createNode('b'))
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(storage, 'setItem')
    expect(executeCommand({ type: 'move-nodes', positions: { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } }, now })).toBe(true)
    const moved = useCanvasSessionStore.getState().snapshot
    expect(moved.nodesById.a.position).toEqual({ x: 1, y: 2 })
    expect(moved.nodesById.b.position).toEqual({ x: 3, y: 4 })
    expect(writes).toHaveBeenCalledTimes(1)
    expect(selectCanUndo(useCanvasSessionStore.getState())).toBe(true)
    expect(undo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
    expect(writes).toHaveBeenCalledTimes(2)
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(true)
    expect(redo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot).toEqual(moved)
    expect(writes).toHaveBeenCalledTimes(3)
    expect(JSON.parse(storage.getItem(CANVAS_STORAGE_KEY)!)).toEqual(moved)
  })

  it('undoes_and_redoes_all_normalized_structural_changes_exactly', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    const snapshots = [useCanvasSessionStore.getState().snapshot]
    const commands: CanvasCommand[] = [createNode('a'), createNode('b'),
      { type: 'duplicate-nodes', duplicates: [{ sourceNodeId: 'a', nodeId: 'copy', versionIds: {} }], now },
      { type: 'set-node-lock', nodeIds: ['copy'], locked: true, now },
      { type: 'create-edge', edge: { id: 'edge', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null }, now },
      { type: 'auto-layout', now }, { type: 'delete-edge', edgeId: 'edge', now },
      { type: 'delete-selection', nodeIds: ['a', 'copy'], edgeIds: [], now }]
    for (const command of commands) {
      expect(useCanvasSessionStore.getState().executeCommand(command)).toBe(true)
      snapshots.push(useCanvasSessionStore.getState().snapshot)
    }
    for (let i = snapshots.length - 2; i >= 0; i--) {
      expect(useCanvasSessionStore.getState().undo()).toBe(true)
      expect(useCanvasSessionStore.getState().snapshot).toEqual(snapshots[i])
    }
    expect(selectCanUndo(useCanvasSessionStore.getState())).toBe(false)
    expect(undo()).toBe(false)
    for (const snapshot of snapshots.slice(1)) {
      expect(useCanvasSessionStore.getState().redo()).toBe(true)
      expect(useCanvasSessionStore.getState().snapshot).toEqual(snapshot)
    }
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(false)
    expect(redo()).toBe(false)
  })

  it('restores_deleted_versions_tasks_and_group_membership_exactly', () => {
    const storage = memoryStorage()
    const snapshot = createEmptySnapshot('canvas', now)
    snapshot.nodesById = { a: { ...createNode('a').node, versionIds: ['v'], currentVersionId: 'v', taskId: 't' }, b: createNode('b').node }
    snapshot.nodeOrder = ['b', 'a']
    snapshot.versionsById = { v: { id: 'v', nodeId: 'a', createdAt: now, content: '正文' } }
    snapshot.versionOrder = ['v']
    snapshot.tasksById = { t: {
      id: 't', nodeId: 'a', sourceNodeId: 'a', resultNodeId: 'a', status: 'interrupted', attempt: 1,
      request: { contentType: 'text', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
      createdAt: now, updatedAt: now,
    } }
    snapshot.groupsById = { g: { id: 'g', name: '组', nodeIds: ['a', 'b'], createdAt: now, updatedAt: now } }
    snapshot.groupOrder = ['g']
    snapshot.edgesById = { e: { id: 'e', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'instruction', sourceVersionId: 'v' } }
    snapshot.edgeOrder = ['e']
    saveCanvasSnapshot(storage, snapshot)
    hydrateCanvasSession(storage, now)
    expect(executeCommand({ type: 'delete-selection', nodeIds: ['a'], edgeIds: [], now: '2026-10-04T01:00:00.000Z' })).toBe(true)
    const deleted = useCanvasSessionStore.getState().snapshot
    expect(deleted.nodeOrder).toEqual(['b'])
    expect(deleted.versionOrder).toEqual([])
    expect(deleted.tasksById).toEqual({})
    expect(deleted.groupsById.g.nodeIds).toEqual(['b'])
    expect(deleted.edgeOrder).toEqual([])
    expect(undo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot).toEqual(snapshot)
    expect(JSON.parse(storage.getItem(CANVAS_STORAGE_KEY)!)).toEqual(snapshot)
    expect(redo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot).toEqual(deleted)
    expect(JSON.parse(storage.getItem(CANVAS_STORAGE_KEY)!)).toEqual(deleted)
  })

  it('keeps_only_the_latest_50_undo_entries_and_50_redo_entries', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    executeCommand(createNode('a'))
    for (let x = 1; x <= 55; x++) executeCommand({ type: 'move-nodes', positions: { a: { x, y: 20 } }, now })
    for (let i = 0; i < 50; i++) expect(undo()).toBe(true)
    expect(undo()).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 5, y: 20 })
    for (let i = 0; i < 50; i++) expect(redo()).toBe(true)
    expect(redo()).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 55, y: 20 })
    const stored = JSON.parse(storage.getItem(CANVAS_STORAGE_KEY)!)
    expect(stored).toEqual(useCanvasSessionStore.getState().snapshot)
    expect(stored).not.toHaveProperty('canUndo')
    expect(stored).not.toHaveProperty('undoStack')
  })

  it('skips_rejected_and_no_op_commands_without_writes_or_history', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    executeCommand(createNode('a'))
    undo()
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(storage, 'setItem')
    expect(executeCommand({ type: 'delete-edge', edgeId: 'missing', now })).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(selectCanUndo(useCanvasSessionStore.getState())).toBe(false)
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(true)
    expect(writes).not.toHaveBeenCalled()
    redo()
    writes.mockClear()
    expect(executeCommand(createNode('a'))).toBe(false)
    expect(executeCommand({ type: 'move-nodes', positions: { a: { x: 10, y: 20 } }, now })).toBe(false)
    expect(writes).not.toHaveBeenCalled()
    expect(undo()).toBe(true)
    expect(undo()).toBe(false)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('clears_redo_only_after_a_new_accepted_command', () => {
    hydrateCanvasSession(memoryStorage(), now)
    executeCommand(createNode('a'))
    undo()
    executeCommand(createNode('b'))
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(false)
    expect(redo()).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['b'])
  })

  it('clears_both_stacks_on_hydration_and_does_not_persist_empty_history_actions', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    executeCommand(createNode('a'))
    executeCommand(createNode('b'))
    undo()
    expect(selectCanUndo(useCanvasSessionStore.getState())).toBe(true)
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(true)
    const writes = vi.spyOn(storage, 'setItem')
    hydrateCanvasSession(storage, now)
    expect(selectCanUndo(useCanvasSessionStore.getState())).toBe(false)
    expect(selectCanRedo(useCanvasSessionStore.getState())).toBe(false)
    expect(undo()).toBe(false)
    expect(redo()).toBe(false)
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a'])
  })

  it('preserves_later_title_and_viewport_edits_during_structural_undo_redo', () => {
    hydrateCanvasSession(memoryStorage(), now)
    executeCommand(createNode('a'))
    renameCanvas('后来标题')
    updateViewport({ x: 12, y: 34, zoom: 0.5 })
    undo()
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual([])
    expect(useCanvasSessionStore.getState().snapshot.canvas.name).toBe('后来标题')
    expect(useCanvasSessionStore.getState().snapshot.viewport).toEqual({ x: 12, y: 34, zoom: 0.5 })
    redo()
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a'])
    expect(useCanvasSessionStore.getState().snapshot.canvas.name).toBe('后来标题')
    expect(useCanvasSessionStore.getState().snapshot.viewport).toEqual({ x: 12, y: 34, zoom: 0.5 })
  })

  it('keeps_in_memory_history_on_save_failure_and_attempts_once_per_transition', () => {
    const storage = memoryStorage()
    hydrateCanvasSession(storage, now)
    const writes = vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(executeCommand(createNode('a'))).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a'])
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
    expect(undo()).toBe(true)
    expect(redo()).toBe(true)
    expect(writes).toHaveBeenCalledTimes(3)
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBeNull()
  })

  it('keeps_protected_primary_value_through_execute_undo_and_redo', () => {
    const raw = JSON.stringify({ schemaVersion: 4, payload: 'x'.repeat(650) })
    localStorage.setItem(CANVAS_STORAGE_KEY, raw)
    hydrateCanvasSession(localStorage, now)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    expect(executeCommand(createNode('a'))).toBe(true)
    expect(undo()).toBe(true)
    expect(redo()).toBe(true)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(raw)
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBeNull()
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
    expect(writes).not.toHaveBeenCalled()
  })
})
