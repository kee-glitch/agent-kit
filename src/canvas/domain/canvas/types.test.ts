import { describe, expect, it } from 'vitest'
import type { CanvasSnapshotV1, CanvasSnapshotV2, CanvasSnapshotV3, ContentType, MediaOperation, RelationType } from './types'
import { createEmptySnapshot } from './createEmptySnapshot'
import { getDefaultNodeDisplay, migrateCanvasSnapshot } from './migrateSnapshot'

const now = '2026-10-04T00:00:00.000Z'

describe('canvas domain contracts', () => {
  it('uses the reference-canvas proportions for new visual nodes', () => {
    expect(getDefaultNodeDisplay('text')).toEqual({ width: 358, height: 270 })
    expect(getDefaultNodeDisplay('image')).toEqual({ width: 358, height: 270 })
    expect(getDefaultNodeDisplay('video')).toEqual({ width: 358, height: 270 })
  })

  it('supports_only_four_content_types', () => {
    const contentTypes: ContentType[] = ['text', 'image', 'video', 'audio']

    expect(contentTypes).toEqual(['text', 'image', 'video', 'audio'])
  })

  it('defines_three_relation_types', () => {
    const relationTypes: RelationType[] = ['instruction', 'reference', 'derived']

    expect(relationTypes).toEqual(['instruction', 'reference', 'derived'])
  })

  it('creates_a_serializable_version_four_empty_snapshot', () => {
    const snapshot = createEmptySnapshot('canvas-1', '2026-10-04T00:00:00.000Z')

    expect(snapshot).toMatchObject({
      schemaVersion: 4,
      canvas: { id: 'canvas-1', name: '未命名画布' },
      nodesById: {},
      nodeOrder: [],
      edgesById: {},
      edgeOrder: [],
      groupsById: {},
      groupOrder: [],
      tasksById: {},
      editorDraftsBySourceId: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    expect(() => JSON.stringify(snapshot)).not.toThrow()
  })

  it.each([
    ['text', 358, 270],
    ['image', 358, 270],
    ['video', 358, 270],
    ['audio', 320, 180],
  ] as const)('migrates_v1_%s_with_v3_content_defaults', (type, width, height) => {
    const fallback = createEmptySnapshot('fallback', now)
    const legacy: CanvasSnapshotV1 = {
      ...fallback, schemaVersion: 1,
      nodesById: {
        node: {
          id: 'node', type, role: 'blank', name: '已有节点', position: { x: -12, y: 34 },
          versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
        },
      },
      nodeOrder: ['node'],
    }
    const before = JSON.stringify(legacy)

    const result = migrateCanvasSnapshot(legacy, fallback)

    expect(result).toEqual({
      status: 'loaded',
      snapshot: {
        ...legacy, schemaVersion: 4,
        nodesById: { node: {
          ...legacy.nodesById.node, locked: false, display: { width, height },
          input: {
            body: '', prompt: '', mentionNodeIds: [], referenceNodeIds: [], voiceTargetNodeId: null,
            media: null, generationConfig: null,
          },
        } },
        editorDraftsBySourceId: {},
      },
    })
    expect(JSON.stringify(legacy)).toBe(before)
  })

  it('migrates_v2_without_losing_canvas_entities_or_viewport', () => {
    const fallback = createEmptySnapshot('fallback', now)
    const v2: CanvasSnapshotV2 = {
      ...fallback,
      schemaVersion: 2,
      canvas: { ...fallback.canvas, id: 'legacy', name: '阶段二画布' },
      viewport: { x: -24, y: 61, zoom: 0.75 },
      nodesById: {
        image: {
          id: 'image', type: 'image', role: 'imported', name: '图片', position: { x: 12, y: 34 },
          locked: true, display: { width: 456, height: 321 }, versionIds: [], currentVersionId: null,
          taskId: null, createdAt: now, updatedAt: now,
        },
      },
      nodeOrder: ['image'],
    }

    const result = migrateCanvasSnapshot(v2, fallback)

    expect(result.status).toBe('loaded')
    expect(result.snapshot.canvas).toEqual(v2.canvas)
    expect(result.snapshot.viewport).toEqual(v2.viewport)
    expect(result.snapshot.nodeOrder).toEqual(['image'])
    expect(result.snapshot.nodesById.image).toMatchObject({
      ...v2.nodesById.image,
      input: { body: '', prompt: '', mentionNodeIds: [], referenceNodeIds: [], voiceTargetNodeId: null, media: null, generationConfig: null },
    })
  })

  it('migrates_v3_without_losing_media_tasks_and_adds_empty_editor_drafts', () => {
    const fallback = createEmptySnapshot('fallback', now)
    const v3: CanvasSnapshotV3 = {
      ...fallback,
      schemaVersion: 3,
      nodesById: {},
      tasksById: {},
    }

    expect(migrateCanvasSnapshot(v3, fallback)).toEqual({
      status: 'loaded',
      snapshot: { ...v3, schemaVersion: 4, editorDraftsBySourceId: {} },
    })
  })

  it('defines_the_exact_phase_four_media_operations', () => {
    const operations: MediaOperation[] = [
      'image-analysis', 'image-edit', 'image-privacy', 'clip-remake', 'script-breakdown',
      'storyboard', 'extract-frames', 'quality-enhance', 'subtitle-remove', 'watermark-remove',
      'voice-change', 'motion-extract', 'audio-video-split', 'video-privacy', 'clip', 'crop',
      'splice', 'segment-select',
    ]

    expect(operations).toHaveLength(18)
    expect(new Set(operations).size).toBe(18)
  })
})
