import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import type { CanvasSnapshot, CanvasSnapshotV1 } from '../../domain/canvas/types'
import {
  CANVAS_QUARANTINE_KEY,
  CANVAS_STORAGE_KEY,
  loadCanvasSnapshot,
  parseCanvasSnapshot,
  saveCanvasSnapshot,
} from './canvasSnapshot'

const fallback = createEmptySnapshot('fallback', '2026-10-04T00:00:00.000Z')
const now = '2026-10-04T00:00:00.000Z'

describe('canvas snapshot persistence', () => {
  beforeEach(() => localStorage.clear())

  it('loads_a_valid_version_four_snapshot', () => {
    const snapshot = createEmptySnapshot('saved', '2026-10-03T00:00:00.000Z')
    snapshot.viewport = { x: -12, y: 34, zoom: 0.5 }
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(snapshot))

    expect(loadCanvasSnapshot(localStorage, fallback)).toEqual({
      status: 'loaded', snapshot, hadStoredValue: true, canPersist: true,
    })
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBeNull()
  })

  it.each([
    ['quarantines_corrupt_json_and_returns_fallback', '{broken', 'corrupt-json'],
    ['rejects_future_schema_without_guessing', JSON.stringify({ schemaVersion: 5 }), 'unsupported-version'],
  ])('%s', (_name, raw, reason) => {
    localStorage.setItem(CANVAS_STORAGE_KEY, raw)

    expect(loadCanvasSnapshot(localStorage, fallback)).toEqual({
      status: 'recovered', snapshot: fallback, reason, hadStoredValue: true, canPersist: true,
    })
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBe(raw)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(JSON.stringify(fallback))
  })

  it('returns_fallback_when_nothing_has_been_saved', () => {
    expect(loadCanvasSnapshot(localStorage, fallback)).toEqual({
      status: 'loaded', snapshot: fallback, hadStoredValue: false, canPersist: true,
    })
  })

  it('saves_the_complete_snapshot_without_mutating_it', () => {
    const before = JSON.stringify(fallback)
    saveCanvasSnapshot(localStorage, fallback)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(before)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).schemaVersion).toBe(4)
    expect(JSON.stringify(fallback)).toBe(before)
  })

  it.each([
    ['object_url', 'blob:https://example.test/temporary'],
    ['large_base64', `data:image/png;base64,${'A'.repeat(1024 * 1024)}`],
  ])('omits_%s_from_saved_media_and_rejects_unsafe_existing_snapshots', (_name, content) => {
    const snapshot = createEmptySnapshot('imported', '2026-10-04T00:00:00.000Z')
    snapshot.nodesById.image = {
      id: 'image', type: 'image', role: 'imported', name: 'Image', position: { x: 0, y: 0 },
      locked: false, display: { width: 320, height: 260 },
      input: createEmptyNodeInput(),
      versionIds: ['media'], currentVersionId: 'media', taskId: null,
      createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
    }
    snapshot.nodeOrder = ['image']
    snapshot.versionsById.media = {
      id: 'media', nodeId: 'image', createdAt: '2026-10-04T00:00:00.000Z', content,
    }
    snapshot.versionOrder = ['media']
    const raw = JSON.stringify(snapshot)

    saveCanvasSnapshot(localStorage, snapshot)
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)!
    const expected = {
      ...snapshot, versionsById: { media: { ...snapshot.versionsById.media, content: null } },
    }
    expect(JSON.parse(stored).versionsById.media.content === null).toBe(true)
    expect(JSON.parse(stored)).toEqual(expected)
    expect(parseCanvasSnapshot(stored, fallback)).toEqual({ status: 'loaded', snapshot: expected })
    expect(snapshot.versionsById.media.content).toBe(content)

    localStorage.setItem(CANVAS_STORAGE_KEY, raw)
    expect(loadCanvasSnapshot(localStorage, fallback)).toEqual({
      status: 'recovered', snapshot: fallback, reason: 'corrupt-json', hadStoredValue: true, canPersist: true,
    })
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBe(raw)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(JSON.stringify(fallback))

    snapshot.versionsById.media.content = 'https://example.test/assets/image.png'
    saveCanvasSnapshot(localStorage, snapshot)
    expect(loadCanvasSnapshot(localStorage, fallback).snapshot).toEqual(snapshot)
    snapshot.nodesById.image.type = 'text'
    snapshot.versionsById.media.content = content
    saveCanvasSnapshot(localStorage, snapshot)
    expect(loadCanvasSnapshot(localStorage, fallback).snapshot).toEqual(snapshot)
  })

  it('loads_populated_maps_and_preserves_entity_content', () => {
    const snapshot = createEmptySnapshot('populated', '2026-10-04T00:00:00.000Z')
    snapshot.canvas.name = '已有画布名称'
    snapshot.viewport = { x: -42, y: 70, zoom: 1.25 }
    snapshot.nodesById.node = {
      id: 'node', type: 'text', role: 'blank', name: '文本', position: { x: 2, y: 3 },
      locked: true, display: { width: 456, height: 123 },
      input: createEmptyNodeInput(),
      versionIds: ['version'], currentVersionId: 'version', taskId: 'task',
      createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
    }
    snapshot.nodeOrder = ['node']
    snapshot.versionsById.version = {
      id: 'version', nodeId: 'node', createdAt: '2026-10-04T00:00:00.000Z', content: 'Hello',
    }
    snapshot.versionOrder = ['version']
    snapshot.edgesById.edge = {
      id: 'edge', sourceNodeId: 'node', targetNodeId: 'node', relationType: 'reference', sourceVersionId: 'version',
    }
    snapshot.edgeOrder = ['edge']
    snapshot.groupsById.group = {
      id: 'group', name: '分组', nodeIds: ['node'],
      createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
    }
    snapshot.groupOrder = ['group']
    snapshot.tasksById.task = {
      id: 'task', nodeId: 'node', status: 'interrupted',
      sourceNodeId: 'node', resultNodeId: 'node', attempt: 1,
      request: { contentType: 'text', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
      createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
    }
    expect(parseCanvasSnapshot(JSON.stringify(snapshot), fallback)).toEqual({ status: 'loaded', snapshot })
    saveCanvasSnapshot(localStorage, snapshot)
    expect(loadCanvasSnapshot(localStorage, fallback).snapshot).toEqual(snapshot)
    expect(loadCanvasSnapshot(localStorage, fallback).snapshot.nodesById.node.display).toEqual({ width: 456, height: 123 })

    const { locked: _locked, display: _display, input: _input, ...legacyNode } = snapshot.nodesById.node
    const legacy: CanvasSnapshotV1 = { ...snapshot, schemaVersion: 1, nodesById: { node: legacyNode } }
    const legacyRaw = JSON.stringify(legacy)
    localStorage.setItem(CANVAS_STORAGE_KEY, legacyRaw)
    const migrated: CanvasSnapshot = {
      ...snapshot, schemaVersion: 4,
      nodesById: { node: { ...legacyNode, locked: false, display: { width: 358, height: 270 }, input: createEmptyNodeInput() } },
      tasksById: { task: {
        ...snapshot.tasksById.task, sourceNodeId: 'node', resultNodeId: 'node', attempt: 1,
        request: { contentType: 'text', prompt: '', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
      } },
    }
    expect(loadCanvasSnapshot(localStorage, fallback)).toEqual({
      status: 'loaded', snapshot: migrated, hadStoredValue: true, canPersist: true,
    })
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(legacyRaw)
    expect(localStorage.getItem(CANVAS_QUARANTINE_KEY)).toBeNull()
    saveCanvasSnapshot(localStorage, migrated)
    expect(loadCanvasSnapshot(localStorage, fallback).snapshot).toEqual(migrated)
    expect(JSON.stringify(legacy)).toBe(legacyRaw)

    const validDraft = {
      sourceNodeId: 'node', mode: 'clip', durationSeconds: 10, inPoint: 1, outPoint: 8,
      crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: 'free', showSafeArea: false },
      clipNodeIds: [], undoStack: [], redoStack: [], dirty: true, updatedAt: now,
    } as const
    const withDraft = { ...snapshot, editorDraftsBySourceId: { node: validDraft } }
    expect(parseCanvasSnapshot(JSON.stringify(withDraft), fallback).status).toBe('loaded')
    for (const editorDraftsBySourceId of [
      { node: { ...validDraft, durationSeconds: Number.NaN } },
      { node: { ...validDraft, inPoint: 9, outPoint: 8 } },
      { node: { ...validDraft, crop: { ...validDraft.crop, x: 1.1 } } },
      { node: { ...validDraft, clipNodeIds: ['missing'] } },
      { node: { ...validDraft, previewUrl: 'blob:https://example.test/editor' } },
    ]) expect(parseCanvasSnapshot(JSON.stringify({ ...snapshot, editorDraftsBySourceId }), fallback).status).toBe('recovered')

    for (const invalid of [
      { ...snapshot, nodeOrder: ['node', 'node'] },
      { ...snapshot, nodeOrder: [] },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, id: 'different' } } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, type: ['text'] } } },
      { ...snapshot, tasksById: { task: { ...snapshot.tasksById.task, status: ['interrupted'] } } },
      { ...snapshot, nodesById: { node: legacyNode } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, locked: 'false' } } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, display: null } } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, display: { width: 0, height: 180 } } } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, display: { width: 280, height: -1 } } } },
      { ...snapshot, nodesById: { node: { ...snapshot.nodesById.node, display: { width: '280', height: 180 } } } },
    ]) {
      expect(parseCanvasSnapshot(JSON.stringify(invalid), fallback).status).toBe('recovered')
    }
  })

  it('returns_fallback_when_storage_reads_are_unavailable', () => {
    const storage = { getItem: () => { throw new Error('Storage blocked') } } as unknown as Storage
    expect(loadCanvasSnapshot(storage, fallback)).toEqual({
      status: 'loaded', snapshot: fallback, hadStoredValue: false, canPersist: false,
    })
  })

  it('returns_recovered_data_and_preserves_original_if_quarantine_write_fails', () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, '{broken')
    const storage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: () => { throw new Error('Quota exceeded') },
    } as unknown as Storage

    expect(loadCanvasSnapshot(storage, fallback)).toEqual({
      status: 'recovered', snapshot: fallback, reason: 'corrupt-json', hadStoredValue: true, canPersist: false,
    })
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe('{broken')
  })

  it.each([
    null,
    [],
    { ...fallback, nodesById: [] },
    { ...fallback, edgesById: null },
    { ...fallback, versionsById: [] },
    { ...fallback, groupsById: null },
    { ...fallback, tasksById: [] },
    { ...fallback, canvas: { ...fallback.canvas, id: '' } },
    { ...fallback, nodeOrder: ['missing'] },
    { ...fallback, edgeOrder: [42] },
    { ...fallback, versionOrder: null },
    { ...fallback, groupOrder: {} },
    { ...fallback, viewport: { x: 0, y: 0, zoom: 0 } },
    { ...fallback, viewport: { x: '0', y: 0, zoom: 1 } },
    { ...fallback, nodesById: { invalid: { id: 'invalid' } }, nodeOrder: ['invalid'] },
  ])('recovers_from_malformed_version_one_data_%#', (value) => {
    const legacy = value && !Array.isArray(value) ? { ...value, schemaVersion: 1 } : value
    expect(parseCanvasSnapshot(JSON.stringify(legacy), fallback)).toEqual({
      status: 'recovered', snapshot: fallback, reason: 'corrupt-json',
    })
  })
})
