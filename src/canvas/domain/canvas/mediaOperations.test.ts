import { describe, expect, it } from 'vitest'
import { createEmptySnapshot } from './createEmptySnapshot'
import { createEmptyNodeInput } from './migrateSnapshot'
import { getOperationDefinition, validateMediaOperation } from './mediaOperations'
import type { CanvasNodeEntityV3, MediaOperationRequest } from './types'

const now = '2026-10-04T00:00:00.000Z'
const node = (id: string, type: CanvasNodeEntityV3['type']): CanvasNodeEntityV3 => ({
  id, type, role: 'imported', name: id, position: { x: 0, y: 0 }, locked: false,
  display: { width: 320, height: 240 }, versionIds: [], currentVersionId: null, taskId: null,
  input: { ...createEmptyNodeInput(), media: { source: 'asset', name: id, mimeType: `${type}/test`, assetId: id, durationSeconds: type === 'video' ? 10 : null, requiresReselect: false } },
  createdAt: now, updatedAt: now,
})

describe('media operation registry', () => {
  it('defines_output_cardinality_labels_and_grouping_from_one_registry', () => {
    expect(getOperationDefinition('image-analysis')).toMatchObject({ inputTypes: ['image'], outputTypes: ['text'], label: '图片分析', grouped: false })
    expect(getOperationDefinition('audio-video-split')).toMatchObject({ inputTypes: ['video'], outputTypes: ['video', 'audio'], grouped: false })
    expect(getOperationDefinition('extract-frames')).toMatchObject({ outputTypes: ['image', 'image', 'image', 'image'], grouped: true })
    expect(getOperationDefinition('storyboard')).toMatchObject({ outputTypes: ['image', 'image', 'image', 'image'], grouped: true })
  })

  it('validates_voice_range_crop_splice_and_source_compatibility', () => {
    const snapshot = createEmptySnapshot('canvas', now)
    snapshot.nodesById = { image: node('image', 'image'), video: node('video', 'video'), audio: node('audio', 'audio') }
    snapshot.nodeOrder = ['image', 'video', 'audio']
    const request: MediaOperationRequest = { kind: 'media-operation', operation: 'voice-change', sourceNodeId: 'video', outputType: 'video', prompt: '', range: null, crop: null, clipNodeIds: [], voiceTargetNodeId: null }
    expect(validateMediaOperation(snapshot, request)).toEqual({ ok: false, error: '请选择目标音色' })
    expect(validateMediaOperation(snapshot, { ...request, voiceTargetNodeId: 'audio' })).toEqual({ ok: true })
    expect(validateMediaOperation(snapshot, { ...request, operation: 'clip-remake', range: { inPoint: 8, outPoint: 3 } })).toEqual({ ok: false, error: '片段范围无效' })
    expect(validateMediaOperation(snapshot, { ...request, operation: 'crop', crop: { x: .8, y: 0, width: .4, height: 1, aspectRatio: 'free', showSafeArea: false } })).toEqual({ ok: false, error: '裁剪区域超出画面' })
    expect(validateMediaOperation(snapshot, { ...request, operation: 'splice', clipNodeIds: ['video'] })).toEqual({ ok: false, error: '拼接至少需要两个视频片段' })
    expect(validateMediaOperation(snapshot, { ...request, operation: 'image-edit', sourceNodeId: 'video', outputType: 'image' })).toEqual({ ok: false, error: '当前素材不支持此处理' })
  })
})
