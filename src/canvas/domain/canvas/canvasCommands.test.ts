import { describe, expect, it, vi } from 'vitest'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../../features/persistence/canvasSnapshot'
import { applyCanvasCommand, type CanvasCommand } from './canvasCommands'
import { createEmptySnapshot } from './createEmptySnapshot'
import { createEmptyNodeInput, migrateCanvasSnapshot } from './migrateSnapshot'
import type { CanvasNodeEntityV3, CanvasSnapshot, ContentType, MediaEditorDraft } from './types'

const now = '2026-10-04T00:00:00.000Z'
const later = '2026-10-04T01:00:00.000Z'

function node(id: string, type: ContentType = 'text'): CanvasNodeEntityV3 {
  return { id, type, role: 'blank', name: id, position: { x: 10, y: 20 },
    versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
    locked: false, display: { width: 280, height: 180 }, input: createEmptyNodeInput() }
}

function populated(): CanvasSnapshot {
  return { ...createEmptySnapshot('canvas', now), nodesById: { a: node('a'), b: node('b'), c: { ...node('c'), locked: true } },
    nodeOrder: ['b', 'a', 'c'], edgesById: {
      ab: { id: 'ab', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null },
      bc: { id: 'bc', sourceNodeId: 'b', targetNodeId: 'c', relationType: 'derived', sourceVersionId: null },
    }, edgeOrder: ['bc', 'ab'] }
}

describe('pure canvas commands', () => {
  it('atomically_submits_independent_split_branches_and_a_grouped_frame_set', () => {
    const snapshot = populated()
    snapshot.nodesById.a.type = 'video'
    const split = applyCanvasCommand(snapshot, { type: 'submit-media-operation', now: later, sourceNodeId: 'a', operationLabel: '音视频分离', group: null, branches: [
      { branchId: 'video', edgeId: 'edge-video', node: { ...node('result-video', 'video'), role: 'derived', taskId: 'task-video' }, task: { id: 'task-video', nodeId: 'result-video', sourceNodeId: 'a', resultNodeId: 'result-video', status: 'queued', attempt: 1, request: { contentType: 'video', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null, branchId: 'video', operation: { kind: 'media-operation', operation: 'audio-video-split', sourceNodeId: 'a', outputType: 'video', prompt: '', range: null, crop: null, clipNodeIds: [], voiceTargetNodeId: null } }, createdAt: later, updatedAt: later } },
      { branchId: 'audio', edgeId: 'edge-audio', node: { ...node('result-audio', 'audio'), role: 'derived', taskId: 'task-audio' }, task: { id: 'task-audio', nodeId: 'result-audio', sourceNodeId: 'a', resultNodeId: 'result-audio', status: 'queued', attempt: 1, request: { contentType: 'audio', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null, branchId: 'audio', operation: { kind: 'media-operation', operation: 'audio-video-split', sourceNodeId: 'a', outputType: 'audio', prompt: '', range: null, crop: null, clipNodeIds: [], voiceTargetNodeId: null } }, createdAt: later, updatedAt: later } },
    ] })
    expect(split.nodeOrder.slice(-2)).toEqual(['result-video', 'result-audio'])
    expect(split.edgesById['edge-audio'].operationLabel).toBe('音视频分离')
    expect(split.tasksById['task-video'].request?.branchId).toBe('video')
    expect(snapshot.nodesById['result-video']).toBeUndefined()

    const rejected = applyCanvasCommand(snapshot, { type: 'submit-media-operation', now: later, sourceNodeId: 'a', operationLabel: '抽帧', group: null, branches: [
      { branchId: 'bad', edgeId: 'edge', node: { ...node('a', 'image'), taskId: 'task' }, task: split.tasksById['task-video'] },
    ] })
    expect(rejected).toBe(snapshot)
  })

  it('updates_undoes_redoes_and_discards_serializable_editor_drafts', () => {
    const snapshot = populated()
    const draft: MediaEditorDraft = { sourceNodeId: 'a', mode: 'clip', durationSeconds: 10, inPoint: 1, outPoint: 8,
      crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: 'free', showSafeArea: false }, clipNodeIds: [],
      undoStack: [], redoStack: [], dirty: true, updatedAt: later }
    const updated = applyCanvasCommand(snapshot, { type: 'update-editor-draft', draft, now: later })
    const changed = applyCanvasCommand(updated, { type: 'update-editor-draft', draft: { ...draft, inPoint: 2 }, now: later })
    expect(changed.editorDraftsBySourceId.a.undoStack).toHaveLength(1)
    const undone = applyCanvasCommand(changed, { type: 'undo-editor-draft', sourceNodeId: 'a', now: later })
    expect(undone.editorDraftsBySourceId.a.inPoint).toBe(1)
    const redone = applyCanvasCommand(undone, { type: 'redo-editor-draft', sourceNodeId: 'a', now: later })
    expect(redone.editorDraftsBySourceId.a.inPoint).toBe(2)
    expect(applyCanvasCommand(redone, { type: 'discard-editor-draft', sourceNodeId: 'a', now: later }).editorDraftsBySourceId.a).toBeUndefined()
  })
  it('updates_content_and_reference_inputs_without_mutating_the_original', () => {
    const snapshot = populated()
    const withBody = applyCanvasCommand(snapshot, { type: 'update-node-body', nodeId: 'a', body: '正文', now: later })
    const withPrompt = applyCanvasCommand(withBody, {
      type: 'update-node-prompt', nodeId: 'a', prompt: '参考 @[图片](node:b)', mentionNodeIds: ['b'], now: later,
    })
    const withReference = applyCanvasCommand(withPrompt, {
      type: 'add-reference', targetNodeId: 'a', sourceNodeId: 'b', edgeId: 'ref-ba', mention: true, now: later,
    })
    expect(withReference.nodesById.a.input).toMatchObject({
      body: '正文', prompt: '参考 @[图片](node:b)', mentionNodeIds: ['b'], referenceNodeIds: ['b'],
    })
    expect(withReference.edgesById['ref-ba']).toMatchObject({ sourceNodeId: 'b', targetNodeId: 'a', relationType: 'reference' })
    expect(snapshot.nodesById.a.input?.body).toBe('')
  })

  it('removes_reference_tokens_only_when_reference_is_explicitly_removed', () => {
    const snapshot = populated()
    snapshot.nodesById.a.input = {
      ...snapshot.nodesById.a.input!, prompt: '参考 @[图片](node:b)', mentionNodeIds: ['b'], referenceNodeIds: ['b'],
    }
    snapshot.edgesById.ref = { id: 'ref', sourceNodeId: 'b', targetNodeId: 'a', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder.push('ref')
    const keepEdge = applyCanvasCommand(snapshot, {
      type: 'remove-reference', targetNodeId: 'a', sourceNodeId: 'b', deleteEdge: false, now: later,
    })
    expect(keepEdge.nodesById.a.input).toMatchObject({ prompt: '参考', mentionNodeIds: [], referenceNodeIds: [] })
    expect(keepEdge.edgesById.ref).toBeDefined()
    const deleteEdge = applyCanvasCommand(snapshot, {
      type: 'remove-reference', targetNodeId: 'a', sourceNodeId: 'b', deleteEdge: true, now: later,
    })
    expect(deleteEdge.edgesById.ref).toBeUndefined()
  })

  it('submits_generation_with_a_result_edge_and_immutable_request_snapshot', () => {
    const snapshot = populated()
    snapshot.nodesById.a.input = { ...snapshot.nodesById.a.input!, prompt: '生成一张图', referenceNodeIds: ['b'] }
    const resultNode = { ...node('result', 'image'), role: 'generated' as const, taskId: 'task' }
    const task = {
      id: 'task', nodeId: 'result', sourceNodeId: 'a', resultNodeId: 'result', status: 'queued' as const, attempt: 1,
      request: { contentType: 'image' as const, prompt: '生成一张图', referenceNodeIds: ['b'], voiceTargetNodeId: null, generationConfig: null },
      createdAt: later, updatedAt: later,
    }
    const result = applyCanvasCommand(snapshot, { type: 'submit-generation', resultNode, task, edgeId: 'derived', now: later })
    expect(result.nodeOrder.at(-1)).toBe('result')
    expect(result.edgesById.derived).toEqual({ id: 'derived', sourceNodeId: 'a', targetNodeId: 'result', relationType: 'derived', sourceVersionId: null, operationLabel: '生成' })
    expect(result.tasksById.task.request).toEqual(task.request)
    expect(snapshot.tasksById.task).toBeUndefined()
  })
  it.each<ContentType>(['text', 'image', 'video', 'audio'])('creates_%s_with_injected_entity_and_order', (type) => {
    const snapshot = createEmptySnapshot('canvas', now)
    const entity = node('new', type)
    const result = applyCanvasCommand(snapshot, { type: 'create-node', node: entity })
    expect(result.nodesById.new).toEqual(entity)
    expect(result.nodeOrder).toEqual(['new'])
    expect(snapshot.nodeOrder).toEqual([])
    // Caller-owned command values cannot mutate the accepted snapshot later.
    entity.position.x = 999
    expect(result.nodesById.new.position.x).toBe(10)
  })

  it('rejects_duplicate_or_blank_creation_ids', () => {
    const snapshot = populated()
    for (const id of ['a', ' ']) expect(applyCanvasCommand(snapshot, { type: 'create-node', node: node(id) })).toBe(snapshot)
  })

  it('moves_multiple_unlocked_nodes_once_without_mutating_input', () => {
    const snapshot = populated()
    const before = JSON.stringify(snapshot)
    const result = applyCanvasCommand(snapshot, { type: 'move-nodes', positions: { a: { x: -1, y: 2 }, b: { x: 3, y: 4 }, c: { x: 9, y: 9 } }, now: later })
    expect(result.nodesById.a.position).toEqual({ x: -1, y: 2 })
    expect(result.nodesById.b.position).toEqual({ x: 3, y: 4 })
    expect(result.nodesById.c).toBe(snapshot.nodesById.c)
    expect(result.nodesById.a.updatedAt).toBe(later)
    expect(result.canvas.updatedAt).toBe(later)
    expect(JSON.stringify(snapshot)).toBe(before)
  })

  it('rejects_invalid_positions_and_ignores_missing_locked_or_unchanged_moves', () => {
    const snapshot = populated()
    expect(applyCanvasCommand(snapshot, { type: 'move-nodes', positions: { a: { x: NaN, y: 2 } }, now: later })).toBe(snapshot)
    expect(applyCanvasCommand(snapshot, { type: 'move-nodes', positions: { a: { x: 10, y: 20 }, c: { x: 8, y: 8 }, missing: { x: 1, y: 2 } }, now: later })).toBe(snapshot)
  })

  it('duplicates_persistable_content_with_fixed_offset_new_ids_and_no_task_state', () => {
    const snapshot = populated()
    snapshot.nodesById.a = { ...snapshot.nodesById.a, role: 'generated', versionIds: ['v'], currentVersionId: 'v', taskId: 'task' }
    snapshot.nodesById.b = { ...snapshot.nodesById.b, type: 'image', versionIds: ['media'], currentVersionId: 'media' }
    snapshot.versionsById = { v: { id: 'v', nodeId: 'a', createdAt: now, content: '正文' }, media: { id: 'media', nodeId: 'b', createdAt: now, content: 'blob:temporary' } }
    snapshot.versionOrder = ['media', 'v']
    snapshot.tasksById = { task: {
      id: 'task', nodeId: 'a', sourceNodeId: 'a', resultNodeId: 'a', status: 'processing', attempt: 1,
      request: { contentType: 'text', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
      createdAt: now, updatedAt: now,
    } }
    const before = JSON.stringify(snapshot)
    const result = applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [
      { sourceNodeId: 'a', nodeId: 'copy-a', versionIds: { v: 'copy-v' } },
      { sourceNodeId: 'b', nodeId: 'copy-b', versionIds: { media: 'copy-media' } },
    ], now: later })
    expect(result.nodeOrder).toEqual(['b', 'a', 'c', 'copy-a', 'copy-b'])
    expect(result.nodesById['copy-a']).toEqual({ ...snapshot.nodesById.a, id: 'copy-a', position: { x: 42, y: 52 }, versionIds: ['copy-v'], currentVersionId: 'copy-v', taskId: null, createdAt: later, updatedAt: later })
    expect(result.versionsById['copy-v']).toEqual({ id: 'copy-v', nodeId: 'copy-a', createdAt: later, content: '正文' })
    expect(result.versionsById['copy-media'].content).toBeNull()
    expect(result.versionOrder).toEqual(['media', 'v', 'copy-v', 'copy-media'])
    expect(result.tasksById).toBe(snapshot.tasksById)
    expect(result.edgeOrder).toEqual(['bc', 'ab'])
    expect(JSON.stringify(snapshot)).toBe(before)
  })

  it('rejects_duplicate_collisions_or_incomplete_version_ids_atomically', () => {
    const snapshot = populated()
    snapshot.nodesById.a = { ...snapshot.nodesById.a, versionIds: ['v'], currentVersionId: 'v' }
    snapshot.versionsById = { v: { id: 'v', nodeId: 'a', createdAt: now, content: '正文' } }
    snapshot.versionOrder = ['v']
    const duplicates: Extract<CanvasCommand, { type: 'duplicate-nodes' }>['duplicates'] = [
      { sourceNodeId: 'a', nodeId: 'a', versionIds: { v: 'new-v' } },
      { sourceNodeId: 'a', nodeId: 'copy', versionIds: {} },
      { sourceNodeId: 'a', nodeId: 'copy', versionIds: { v: 'v' } },
      { sourceNodeId: 'missing', nodeId: 'copy', versionIds: {} },
    ]
    for (const duplicate of duplicates) expect(applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [duplicate], now: later })).toBe(snapshot)
    expect(applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [], now: later })).toBe(snapshot)
  })

  it('omits_unmodeled_temporary_run_fields_from_duplicates', () => {
    const snapshot = populated()
    Object.assign(snapshot.nodesById.a, { runState: { progress: 50 }, objectUrl: 'blob:temporary' })
    const result = applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [{ sourceNodeId: 'a', nodeId: 'copy', versionIds: {} }], now: later })
    expect(result.nodesById.copy).not.toHaveProperty('runState')
    expect(result.nodesById.copy).not.toHaveProperty('objectUrl')
    expect(snapshot.nodesById.a).toHaveProperty('runState')
  })

  it('duplicates_only_custom_display_dimensions_after_save_and_hydration', () => {
    vi.restoreAllMocks()
    localStorage.clear()
    const snapshot = populated()
    Object.assign(snapshot.nodesById.a.display, { width: 456, height: 123, objectUrl: 'blob:display-fixture', runState: { progress: 50 }, unknownDisplay: 'forward-compatible' })
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    const session = useCanvasSessionStore.getState()
    expect(session.recoveryNotice).toBeNull()
    expect(session.snapshot.nodesById.a.display).toHaveProperty('unknownDisplay')
    const before = JSON.stringify(session.snapshot)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    expect(session.executeCommand({ type: 'duplicate-nodes', duplicates: [{ sourceNodeId: 'a', nodeId: 'copy', versionIds: {} }], now: later })).toBe(true)
    const result = useCanvasSessionStore.getState().snapshot
    expect(result.nodesById.copy.display).toEqual({ width: 456, height: 123 })
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodesById.copy.display).toEqual({ width: 456, height: 123 })
    expect(JSON.stringify(session.snapshot)).toBe(before)
    expect(writes).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })

  it('rejects_a_valid_then_invalid_duplicate_batch_without_partial_nodes_or_versions', () => {
    const snapshot = populated()
    snapshot.nodesById.a = { ...snapshot.nodesById.a, versionIds: ['v'], currentVersionId: 'v' }
    snapshot.versionsById = { v: { id: 'v', nodeId: 'a', createdAt: now, content: '正文' } }
    snapshot.versionOrder = ['v']
    const before = JSON.stringify(snapshot)
    const result = applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [
      { sourceNodeId: 'a', nodeId: 'valid-copy', versionIds: { v: 'valid-version' } },
      { sourceNodeId: 'missing', nodeId: 'invalid-copy', versionIds: { v: 'invalid-version' } },
    ], now: later })
    expect(result).toBe(snapshot)
    expect(result.nodeOrder).toBe(snapshot.nodeOrder)
    expect(result.versionOrder).toBe(snapshot.versionOrder)
    for (const id of ['valid-copy', 'invalid-copy']) expect(result.nodesById).not.toHaveProperty(id)
    for (const id of ['valid-version', 'invalid-version']) expect(result.versionsById).not.toHaveProperty(id)
    expect(JSON.stringify(snapshot)).toBe(before)
  })

  it('treats_inherited_version_mapping_names_as_missing_ids', () => {
    const snapshot = populated()
    snapshot.nodesById.a = { ...snapshot.nodesById.a, versionIds: ['toString'], currentVersionId: 'toString' }
    snapshot.versionsById = { toString: { id: 'toString', nodeId: 'a', createdAt: now, content: '正文' } }
    snapshot.versionOrder = ['toString']
    expect(applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [{ sourceNodeId: 'a', nodeId: 'copy', versionIds: {} }], now: later })).toBe(snapshot)
  })
  it('accepts_new_dictionary_prototype_names_as_own_duplicate_ids', () => {
    const snapshot = populated()
    snapshot.nodesById.a = { ...snapshot.nodesById.a, versionIds: ['v'], currentVersionId: 'v' }
    snapshot.versionsById = { v: { id: 'v', nodeId: 'a', createdAt: now, content: '正文' } }
    snapshot.versionOrder = ['v']
    const result = applyCanvasCommand(snapshot, { type: 'duplicate-nodes', duplicates: [{ sourceNodeId: 'a', nodeId: '__proto__', versionIds: { v: '__proto__' } }], now: later })
    expect(Object.hasOwn(result.nodesById, '__proto__')).toBe(true)
    expect(Object.hasOwn(result.versionsById, '__proto__')).toBe(true)
    expect(result.nodesById.__proto__.id).toBe('__proto__')
    expect(result.versionsById.__proto__.nodeId).toBe('__proto__')
  })

  it('locks_and_unlocks_selected_nodes_with_injected_timestamp', () => {
    const snapshot = populated()
    const locked = applyCanvasCommand(snapshot, { type: 'set-node-lock', nodeIds: ['a', 'b'], locked: true, now: later })
    expect(locked.nodesById.a.locked).toBe(true)
    expect(locked.nodesById.b.updatedAt).toBe(later)
    const unlocked = applyCanvasCommand(locked, { type: 'set-node-lock', nodeIds: ['a'], locked: false, now: now })
    expect(unlocked.nodesById.a.locked).toBe(false)
    expect(snapshot.nodesById.a.locked).toBe(false)
    expect(applyCanvasCommand(snapshot, { type: 'set-node-lock', nodeIds: ['c', 'missing'], locked: true, now: later })).toBe(snapshot)
  })

  it('deletes_eligible_selection_and_incident_edges_while_preserving_locked_nodes', () => {
    const snapshot = populated()
    snapshot.nodesById.b = { ...snapshot.nodesById.b, versionIds: ['v'], currentVersionId: 'v', taskId: 't' }
    snapshot.versionsById = { v: { id: 'v', nodeId: 'b', content: '正文', createdAt: now } }
    snapshot.versionOrder = ['v']
    snapshot.tasksById = { t: {
      id: 't', nodeId: 'b', sourceNodeId: 'b', resultNodeId: 'b', status: 'processing', attempt: 1,
      request: { contentType: 'text', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
      createdAt: now, updatedAt: now,
    } }
    snapshot.groupsById = { g: { id: 'g', name: '组', nodeIds: ['b', 'c'], createdAt: now, updatedAt: now } }
    snapshot.groupOrder = ['g']
    const before = JSON.stringify(snapshot)
    const result = applyCanvasCommand(snapshot, { type: 'delete-selection', nodeIds: ['b', 'c', 'missing'], edgeIds: [], now: later })
    expect(result.nodeOrder).toEqual(['a', 'c'])
    expect(result.nodesById.c).toBe(snapshot.nodesById.c)
    expect(result.edgesById).toEqual({})
    expect(result.edgeOrder).toEqual([])
    expect(result.versionsById).toEqual({})
    expect(result.versionOrder).toEqual([])
    expect(result.tasksById).toEqual({})
    expect(result.groupsById.g.nodeIds).toEqual(['c'])
    expect(migrateCanvasSnapshot(result, snapshot).status).toBe('loaded')
    expect(JSON.stringify(snapshot)).toBe(before)
  })

  it('deletes_selected_edges_and_returns_original_for_empty_or_locked_selection', () => {
    const snapshot = populated()
    expect(applyCanvasCommand(snapshot, { type: 'delete-selection', nodeIds: ['c'], edgeIds: ['missing'], now: later })).toBe(snapshot)
    const result = applyCanvasCommand(snapshot, { type: 'delete-selection', nodeIds: [], edgeIds: ['ab'], now: later })
    expect(result.edgeOrder).toEqual(['bc'])
    expect(result.nodeOrder).toBe(snapshot.nodeOrder)
  })

  it('creates_edge_with_existing_endpoints_and_unique_id', () => {
    const snapshot = populated()
    const edge = { id: 'new', sourceNodeId: 'b', targetNodeId: 'a', relationType: 'reference' as const, sourceVersionId: null }
    const result = applyCanvasCommand(snapshot, { type: 'create-edge', edge, now: later })
    expect(result.edgesById.new).toEqual(edge)
    expect(result.edgeOrder).toEqual(['bc', 'ab', 'new'])
    edge.targetNodeId = 'c'
    expect(result.edgesById.new.targetNodeId).toBe('a')
    for (const invalid of [{ ...edge, id: 'ab' }, { ...edge, id: ' ' }, { ...edge, sourceNodeId: 'missing' }, { ...edge, sourceVersionId: 'missing' }])
      expect(applyCanvasCommand(snapshot, { type: 'create-edge', edge: invalid, now: later })).toBe(snapshot)
  })

  it('accepts_owned_source_version_and_rejects_missing_or_wrong_owner_by_identity', () => {
    const snapshot = populated()
    snapshot.versionsById = { own: { id: 'own', nodeId: 'a', createdAt: now, content: 'source' }, other: { id: 'other', nodeId: 'b', createdAt: now, content: 'target' } }
    snapshot.versionOrder = ['own', 'other']
    snapshot.nodesById.a.versionIds = ['own']
    snapshot.nodesById.b.versionIds = ['other']
    const edge = { id: 'new', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'instruction' as const, sourceVersionId: 'own' }
    const accepted = applyCanvasCommand(snapshot, { type: 'create-edge', edge, now: later })
    expect(accepted.edgesById.new).toEqual(edge)
    for (const sourceVersionId of ['other', 'missing', 'constructor']) {
      expect(applyCanvasCommand(snapshot, { type: 'create-edge', edge: { ...edge, sourceVersionId }, now: later })).toBe(snapshot)
    }
  })

  it('enforces_shared_relation_rules_for_direct_callers', () => {
    const snapshot = populated()
    snapshot.nodesById.b.type = 'image'
    const edge = { id: 'new', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference' as const, sourceVersionId: null }
    for (const invalid of [edge, { ...edge, targetNodeId: 'a' }, { ...edge, targetNodeId: 'c' },
      { ...edge, sourceNodeId: 'c' }, { ...edge, sourceNodeId: 'b', targetNodeId: 'a', relationType: 'instruction' as const }]) {
      expect(applyCanvasCommand(snapshot, { type: 'create-edge', edge: invalid, now: later })).toBe(snapshot)
    }
  })

  it('rejected_duplicate_relation_never_enters_history_or_save', () => {
    vi.restoreAllMocks()
    localStorage.clear()
    saveCanvasSnapshot(localStorage, populated())
    hydrateCanvasSession(localStorage, now)
    const snapshot = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    expect(useCanvasSessionStore.getState().executeCommand({ type: 'create-edge', edge: {
      id: 'another', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null,
    }, now: later })).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    expect(useCanvasSessionStore.getState().undo()).toBe(false)
    vi.restoreAllMocks()
  })

  it('deletes_only_the_requested_edge_and_keeps_nodes', () => {
    const snapshot = populated()
    const result = applyCanvasCommand(snapshot, { type: 'delete-edge', edgeId: 'ab', now: later })
    expect(result.edgeOrder).toEqual(['bc'])
    expect(result.edgesById.ab).toBeUndefined()
    expect(result.nodesById).toBe(snapshot.nodesById)
    expect(applyCanvasCommand(snapshot, { type: 'delete-edge', edgeId: 'missing', now: later })).toBe(snapshot)
  })

  it('deletes_an_edge_batch_as_one_history_step_and_one_save_without_touching_endpoints', () => {
    vi.restoreAllMocks()
    localStorage.clear()
    saveCanvasSnapshot(localStorage, populated())
    hydrateCanvasSession(localStorage, now)
    const session = useCanvasSessionStore.getState()
    const before = session.snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    expect(session.executeCommand({ type: 'delete-edge', edgeIds: ['ab', 'bc'], now: later })).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toEqual([])
    expect(useCanvasSessionStore.getState().snapshot.nodesById).toBe(before.nodesById)
    expect(writes).toHaveBeenCalledTimes(1)
    expect(session.undo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
    expect(session.undo()).toBe(false)
    expect(session.redo()).toBe(true)
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toEqual([])
    expect(writes).toHaveBeenCalledTimes(3)
    vi.restoreAllMocks()
  })

  it('applies_layout_once_and_keeps_locked_positions', () => {
    const snapshot = populated()
    const result = applyCanvasCommand(snapshot, { type: 'auto-layout', now: later })
    expect(result.nodesById.a.position).toEqual({ x: 0, y: 0 })
    expect(result.nodesById.b.position).toEqual({ x: 400, y: 0 })
    expect(result.nodesById.c.position).toEqual({ x: 10, y: 20 })
    expect(applyCanvasCommand(result, { type: 'auto-layout', now: now })).toBe(result)
    const empty = createEmptySnapshot('empty', now)
    expect(applyCanvasCommand(empty, { type: 'auto-layout', now: later })).toBe(empty)
  })
})
