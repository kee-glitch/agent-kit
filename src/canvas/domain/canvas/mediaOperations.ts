import type { CanvasSnapshot, ContentType, MediaOperation, MediaOperationRequest } from './types'

export interface MediaOperationDefinition {
  label: string
  inputTypes: ContentType[]
  outputTypes: ContentType[]
  grouped: boolean
  requiresRange?: boolean
  requiresCrop?: boolean
  requiresVoiceTarget?: boolean
  minimumClips?: number
}

const fourImages: ContentType[] = ['image', 'image', 'image', 'image']
const video: ContentType[] = ['video']
const definitions: Record<MediaOperation, MediaOperationDefinition> = {
  'image-analysis': { label: '图片分析', inputTypes: ['image'], outputTypes: ['text'], grouped: false },
  'image-edit': { label: '图片编辑', inputTypes: ['image'], outputTypes: ['image'], grouped: false },
  'image-privacy': { label: '隐私保护', inputTypes: ['image'], outputTypes: ['image'], grouped: false },
  'clip-remake': { label: '片段重拍', inputTypes: ['video'], outputTypes: video, grouped: false, requiresRange: true },
  'script-breakdown': { label: '脚本拆解', inputTypes: ['video'], outputTypes: ['text'], grouped: false },
  storyboard: { label: '分镜', inputTypes: ['video'], outputTypes: fourImages, grouped: true },
  'extract-frames': { label: '视频抽帧', inputTypes: ['video'], outputTypes: fourImages, grouped: true },
  'quality-enhance': { label: '画质增强', inputTypes: ['video'], outputTypes: video, grouped: false },
  'subtitle-remove': { label: '字幕擦除', inputTypes: ['video'], outputTypes: video, grouped: false },
  'watermark-remove': { label: '去水印', inputTypes: ['video'], outputTypes: video, grouped: false },
  'voice-change': { label: '换音色', inputTypes: ['video'], outputTypes: video, grouped: false, requiresVoiceTarget: true },
  'motion-extract': { label: '动作提取', inputTypes: ['video'], outputTypes: video, grouped: false },
  'audio-video-split': { label: '音视频分离', inputTypes: ['video'], outputTypes: ['video', 'audio'], grouped: false },
  'video-privacy': { label: '隐私保护', inputTypes: ['video'], outputTypes: video, grouped: false },
  clip: { label: '剪辑', inputTypes: ['video'], outputTypes: video, grouped: false, requiresRange: true },
  crop: { label: '裁剪', inputTypes: ['video'], outputTypes: video, grouped: false, requiresCrop: true },
  splice: { label: '拼接', inputTypes: ['video'], outputTypes: video, grouped: false, minimumClips: 2 },
  'segment-select': { label: '片段选择', inputTypes: ['video'], outputTypes: video, grouped: false, requiresRange: true },
}

export function getOperationDefinition(operation: MediaOperation): MediaOperationDefinition {
  return definitions[operation]
}

export function validateMediaOperation(snapshot: CanvasSnapshot, request: MediaOperationRequest): { ok: true } | { ok: false; error: string } {
  const definition = definitions[request.operation]
  const source = snapshot.nodesById[request.sourceNodeId]
  if (!source || !definition.inputTypes.includes(source.type) || !definition.outputTypes.includes(request.outputType))
    return { ok: false, error: '当前素材不支持此处理' }
  if (!source.input?.media || source.input.media.requiresReselect) return { ok: false, error: '请重新选择本地素材' }
  if (definition.requiresVoiceTarget && (!request.voiceTargetNodeId || snapshot.nodesById[request.voiceTargetNodeId]?.type !== 'audio'))
    return { ok: false, error: '请选择目标音色' }
  if (definition.requiresRange && (!request.range || !Number.isFinite(request.range.inPoint) || !Number.isFinite(request.range.outPoint)
    || request.range.inPoint < 0 || request.range.inPoint >= request.range.outPoint
    || (source.input.media.durationSeconds !== null && request.range.outPoint > source.input.media.durationSeconds)))
    return { ok: false, error: '片段范围无效' }
  if (definition.requiresCrop && (!request.crop || request.crop.x < 0 || request.crop.y < 0 || request.crop.width <= 0 || request.crop.height <= 0
    || request.crop.x + request.crop.width > 1 || request.crop.y + request.crop.height > 1))
    return { ok: false, error: '裁剪区域超出画面' }
  if (definition.minimumClips && request.clipNodeIds.filter((id) => snapshot.nodesById[id]?.type === 'video').length < definition.minimumClips)
    return { ok: false, error: '拼接至少需要两个视频片段' }
  return { ok: true }
}
