export type ContentType = 'text' | 'image' | 'video' | 'audio'

export type NodeRole = 'blank' | 'imported' | 'generated' | 'derived'

export type RelationType = 'instruction' | 'reference' | 'derived'

export type TaskStatus =
  | 'idle'
  | 'input-preparation'
  | 'validation'
  | 'asset-preparation'
  | 'queued'
  | 'processing'
  | 'result-upload'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'source-missing'
  | 'interrupted'

export interface CanvasNodeEntityV1 {
  id: string
  type: ContentType
  role: NodeRole
  name: string
  position: { x: number; y: number }
  versionIds: string[]
  currentVersionId: string | null
  taskId: string | null
  createdAt: string
  updatedAt: string
}

export interface CanvasNodeEntityV2 extends CanvasNodeEntityV1 {
  locked: boolean
  display: { width: number; height: number }
}

export type ImageAspectRatio = 'auto' | '1:1' | '9:16' | '3:4' | '16:9' | '4:3'
export type ImageResolution = '1K' | '2K' | '4K'
export type ImageQuality = 'standard' | 'high'
export type ImageFormat = 'PNG' | 'JPEG'

export interface ImageGenerationConfig {
  kind: 'image'
  model: string
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
  quality: ImageQuality
  format: ImageFormat
}

export interface VideoGenerationConfig {
  kind: 'video'
  model: string
  aspectRatio: Exclude<ImageAspectRatio, 'auto'>
  resolution: '720p' | '1080p'
  durationSeconds: 5 | 10
  audio: 'none' | 'generate' | 'voice-target'
}

export type GenerationConfig = ImageGenerationConfig | VideoGenerationConfig

export type MediaOperation =
  | 'image-analysis' | 'image-edit' | 'image-privacy'
  | 'clip-remake' | 'script-breakdown' | 'storyboard' | 'extract-frames'
  | 'quality-enhance' | 'subtitle-remove' | 'watermark-remove' | 'voice-change'
  | 'motion-extract' | 'audio-video-split' | 'video-privacy'
  | 'clip' | 'crop' | 'splice' | 'segment-select'

export type EditorMode = 'clip' | 'crop' | 'splice' | 'segment'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
  aspectRatio: 'free' | '1:1' | '9:16' | '16:9' | '4:3'
  showSafeArea: boolean
}

export interface MediaEditorDraftState {
  inPoint: number
  outPoint: number
  crop: CropRect
  clipNodeIds: string[]
}

export interface MediaEditorDraft extends MediaEditorDraftState {
  sourceNodeId: string
  mode: EditorMode
  durationSeconds: number
  undoStack: MediaEditorDraftState[]
  redoStack: MediaEditorDraftState[]
  dirty: boolean
  updatedAt: string
}

export interface MediaOperationRequest {
  kind: 'media-operation'
  operation: MediaOperation
  sourceNodeId: string
  outputType: ContentType
  prompt: string
  range: { inPoint: number; outPoint: number } | null
  crop: CropRect | null
  clipNodeIds: string[]
  voiceTargetNodeId: string | null
}

export interface MediaResultBranch {
  branchId: string
  outputType: ContentType
  label: string
  groupId: string | null
}

export interface NodeMediaMetadata {
  source: 'local' | 'asset' | 'generated'
  name: string
  mimeType: string
  assetId: string | null
  durationSeconds: number | null
  requiresReselect: boolean
}

export interface NodeInputState {
  body: string
  prompt: string
  mentionNodeIds: string[]
  referenceNodeIds: string[]
  voiceTargetNodeId: string | null
  media: NodeMediaMetadata | null
  generationConfig: GenerationConfig | null
}

export interface CanvasNodeEntityV3 extends CanvasNodeEntityV2 {
  input?: NodeInputState
}

export type CanvasNodeEntity = CanvasNodeEntityV3

export interface CanvasEdgeEntity {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationType: RelationType
  sourceVersionId: string | null
  operationLabel?: string
}

export interface CanvasVersion {
  id: string
  nodeId: string
  createdAt: string
  content: string | null
}

export interface CanvasGroup {
  id: string
  name: string
  nodeIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TaskRequestSnapshot {
  contentType: ContentType
  prompt: string
  referenceNodeIds: string[]
  voiceTargetNodeId: string | null
  generationConfig: GenerationConfig | null
  operation?: MediaOperationRequest
  branchId?: string
}

export interface CanvasTaskV2 {
  id: string
  nodeId: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  error?: string
}

export interface CanvasTask extends CanvasTaskV2 {
  sourceNodeId?: string
  resultNodeId?: string
  request?: TaskRequestSnapshot
  attempt?: number
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasSnapshotV1 {
  schemaVersion: 1
  canvas: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
  }
  nodesById: Record<string, CanvasNodeEntityV1>
  nodeOrder: string[]
  edgesById: Record<string, CanvasEdgeEntity>
  edgeOrder: string[]
  versionsById: Record<string, CanvasVersion>
  versionOrder: string[]
  groupsById: Record<string, CanvasGroup>
  groupOrder: string[]
  tasksById: Record<string, CanvasTaskV2>
  viewport: CanvasViewport
}

export interface CanvasSnapshotV2 extends Omit<CanvasSnapshotV1, 'schemaVersion' | 'nodesById'> {
  schemaVersion: 2
  nodesById: Record<string, CanvasNodeEntityV2>
}

export interface CanvasSnapshotV3 extends Omit<CanvasSnapshotV2, 'schemaVersion' | 'nodesById' | 'tasksById'> {
  schemaVersion: 3
  nodesById: Record<string, CanvasNodeEntityV3>
  tasksById: Record<string, CanvasTask>
}

export interface CanvasSnapshotV4 extends Omit<CanvasSnapshotV3, 'schemaVersion'> {
  schemaVersion: 4
  editorDraftsBySourceId: Record<string, MediaEditorDraft>
}

export type CanvasSnapshot = CanvasSnapshotV4
