import { CURRENT_SCHEMA_VERSION } from './createEmptySnapshot'
import type {
  CanvasNodeEntityV2, CanvasNodeEntityV3, CanvasSnapshot, CanvasSnapshotV1, CanvasSnapshotV2, CanvasSnapshotV3,
  CanvasTask, CanvasTaskV2, ContentType, GenerationConfig, MediaEditorDraftState, MediaOperationRequest, NodeInputState,
} from './types'

export type SnapshotParseResult =
  | { status: 'loaded'; snapshot: CanvasSnapshot }
  | { status: 'recovered'; snapshot: CanvasSnapshot; reason: 'corrupt-json' | 'unsupported-version' }

const defaultDisplay: Record<ContentType, { width: number; height: number }> = {
  text: { width: 358, height: 270 },
  image: { width: 358, height: 270 },
  video: { width: 358, height: 270 },
  audio: { width: 320, height: 180 },
}

export function getDefaultNodeDisplay(type: ContentType): { width: number; height: number } {
  return { ...defaultDisplay[type] }
}

export function createEmptyNodeInput(): NodeInputState {
  return {
    body: '', prompt: '', mentionNodeIds: [], referenceNodeIds: [], voiceTargetNodeId: null,
    media: null, generationConfig: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isId(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function isNullableId(value: unknown): boolean {
  return value === null || isId(value)
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isId)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOneOf(value: unknown, choices: readonly string[]): boolean {
  return isString(value) && choices.includes(value)
}

export function isPersistableContent(content: unknown, node: unknown): boolean {
  if (content === null) return true
  if (!isString(content)) return false
  // Text stays literal; media persists references rather than temporary URLs or inline payloads.
  return (isRecord(node) && node.type === 'text') || !/^(blob|data):/i.test(content.trimStart())
}

function hasTimestamps(value: Record<string, unknown>): boolean {
  return isString(value.createdAt) && isString(value.updatedAt)
}

function isEntityMap(value: unknown, validate: (entity: Record<string, unknown>) => boolean): value is Record<string, unknown> {
  return isRecord(value) && Object.entries(value).every(([id, entity]) =>
    isId(id) && isRecord(entity) && entity.id === id && validate(entity),
  )
}

function isOrder(value: unknown, entities: Record<string, unknown>): boolean {
  return isIdList(value) && new Set(value).size === value.length
    && value.length === Object.keys(entities).length
    && value.every((id) => Object.hasOwn(entities, id))
}

function isGenerationConfig(value: unknown): value is GenerationConfig {
  if (!isRecord(value) || !isString(value.kind) || !isString(value.model)) return false
  if (value.kind === 'image') return isOneOf(value.aspectRatio, ['auto', '1:1', '9:16', '3:4', '16:9', '4:3'])
    && isOneOf(value.resolution, ['1K', '2K', '4K']) && isOneOf(value.quality, ['standard', 'high'])
    && isOneOf(value.format, ['PNG', 'JPEG'])
  if (value.kind === 'video') return isOneOf(value.aspectRatio, ['1:1', '9:16', '3:4', '16:9', '4:3'])
    && isOneOf(value.resolution, ['720p', '1080p']) && typeof value.durationSeconds === 'number' && [5, 10].includes(value.durationSeconds)
    && isOneOf(value.audio, ['none', 'generate', 'voice-target'])
  return false
}

function isNodeInput(value: unknown): value is NodeInputState {
  if (!isRecord(value) || !isString(value.body) || !isString(value.prompt)
    || !isIdList(value.mentionNodeIds) || !isIdList(value.referenceNodeIds) || !isNullableId(value.voiceTargetNodeId)) return false
  if (value.generationConfig !== null && !isGenerationConfig(value.generationConfig)) return false
  if (value.media === null) return true
  return isRecord(value.media) && isOneOf(value.media.source, ['local', 'asset', 'generated'])
    && isString(value.media.name) && isString(value.media.mimeType) && isNullableId(value.media.assetId)
    && (value.media.durationSeconds === null || (isFiniteNumber(value.media.durationSeconds) && value.media.durationSeconds >= 0))
    && typeof value.media.requiresReselect === 'boolean'
}

function isTaskRequest(value: unknown): boolean {
  return isRecord(value) && isOneOf(value.contentType, ['text', 'image', 'video', 'audio'])
    && isString(value.prompt) && isIdList(value.referenceNodeIds) && isNullableId(value.voiceTargetNodeId)
    && (value.generationConfig === null || isGenerationConfig(value.generationConfig))
    && (value.operation === undefined || isMediaOperationRequest(value.operation))
    && (value.branchId === undefined || isId(value.branchId))
}

const mediaOperations = [
  'image-analysis', 'image-edit', 'image-privacy', 'clip-remake', 'script-breakdown', 'storyboard',
  'extract-frames', 'quality-enhance', 'subtitle-remove', 'watermark-remove', 'voice-change',
  'motion-extract', 'audio-video-split', 'video-privacy', 'clip', 'crop', 'splice', 'segment-select',
] as const

function isCrop(value: unknown): boolean {
  if (!isRecord(value)) return false
  return ['x', 'y', 'width', 'height'].every((key) => isFiniteNumber(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 1)
    && Number(value.width) > 0 && Number(value.height) > 0
    && Number(value.x) + Number(value.width) <= 1 && Number(value.y) + Number(value.height) <= 1
    && isOneOf(value.aspectRatio, ['free', '1:1', '9:16', '16:9', '4:3']) && typeof value.showSafeArea === 'boolean'
}

function isEditorState(value: unknown): value is MediaEditorDraftState {
  return isRecord(value) && isFiniteNumber(value.inPoint) && isFiniteNumber(value.outPoint)
    && Number(value.inPoint) >= 0 && Number(value.inPoint) < Number(value.outPoint)
    && isCrop(value.crop) && isIdList(value.clipNodeIds)
}

function isMediaOperationRequest(value: unknown): value is MediaOperationRequest {
  return isRecord(value) && value.kind === 'media-operation' && isOneOf(value.operation, mediaOperations)
    && isId(value.sourceNodeId) && isOneOf(value.outputType, ['text', 'image', 'video', 'audio'])
    && isString(value.prompt) && (value.range === null || (isRecord(value.range)
      && isFiniteNumber(value.range.inPoint) && isFiniteNumber(value.range.outPoint)
      && Number(value.range.inPoint) >= 0 && Number(value.range.inPoint) < Number(value.range.outPoint)))
    && (value.crop === null || isCrop(value.crop)) && isIdList(value.clipNodeIds) && isNullableId(value.voiceTargetNodeId)
}

function isSnapshot(value: Record<string, unknown>): value is Record<string, unknown> & (CanvasSnapshotV1 | CanvasSnapshotV2 | CanvasSnapshotV3 | CanvasSnapshot) {
  const { canvas, viewport, nodesById, edgesById, versionsById, groupsById, tasksById } = value
  const schemaVersion = value.schemaVersion
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3 && schemaVersion !== CURRENT_SCHEMA_VERSION) return false
  if (!isRecord(canvas) || !isId(canvas.id) || !isString(canvas.name) || !hasTimestamps(canvas)) return false
  if (!isRecord(viewport) || !isFiniteNumber(viewport.x) || !isFiniteNumber(viewport.y)
    || !isFiniteNumber(viewport.zoom) || viewport.zoom <= 0) return false

  if (!isEntityMap(nodesById, (node) =>
    isOneOf(node.type, ['text', 'image', 'video', 'audio'])
    && isOneOf(node.role, ['blank', 'imported', 'generated', 'derived'])
    && isString(node.name) && isRecord(node.position)
    && isFiniteNumber(node.position.x) && isFiniteNumber(node.position.y)
    && isIdList(node.versionIds) && isNullableId(node.currentVersionId)
    && isNullableId(node.taskId) && hasTimestamps(node)
    && (value.schemaVersion === 1 || (typeof node.locked === 'boolean'
      && isRecord(node.display) && isFiniteNumber(node.display.width) && node.display.width > 0
      && isFiniteNumber(node.display.height) && node.display.height > 0))
    && (schemaVersion < 3 || isNodeInput(node.input)),
  )) return false

  if (!isEntityMap(edgesById, (edge) =>
    isId(edge.sourceNodeId) && isId(edge.targetNodeId)
    && isOneOf(edge.relationType, ['instruction', 'reference', 'derived'])
    && isNullableId(edge.sourceVersionId)
    && (edge.operationLabel === undefined || isString(edge.operationLabel)),
  )) return false

  if (!isEntityMap(versionsById, (version) =>
    isId(version.nodeId) && isString(version.createdAt)
    && isPersistableContent(version.content, nodesById[String(version.nodeId)]),
  )) return false

  if (!isEntityMap(groupsById, (group) =>
    isString(group.name) && isIdList(group.nodeIds) && hasTimestamps(group),
  )) return false

  if (!isEntityMap(tasksById, (task) =>
    isId(task.nodeId) && hasTimestamps(task)
    && isOneOf(task.status, ['idle', 'input-preparation', 'validation', 'asset-preparation', 'queued',
      'processing', 'result-upload', 'completed', 'failed', 'cancelled',
      'source-missing', 'interrupted'])
    && (task.error === undefined || isString(task.error))
    && (schemaVersion < 3 || (isId(task.sourceNodeId) && isId(task.resultNodeId)
      && isTaskRequest(task.request) && Number.isInteger(task.attempt) && Number(task.attempt) > 0)),
  )) return false

  if (schemaVersion >= 3) {
    for (const [id, rawNode] of Object.entries(nodesById)) {
      const node = rawNode as unknown as Record<string, unknown>
      const input = node.input as Record<string, unknown>
      const config = input.generationConfig
      if (isRecord(config) && config.kind !== node.type) return false
      const voiceId = input.voiceTargetNodeId
      if (typeof voiceId === 'string' && (voiceId === id || !isRecord(nodesById[voiceId]) || (nodesById[voiceId] as Record<string, unknown>).type !== 'audio')) return false
      for (const versionId of node.versionIds as string[]) if (!isRecord(versionsById[versionId]) || (versionsById[versionId] as Record<string, unknown>).nodeId !== id) return false
      if (node.currentVersionId !== null && !(node.versionIds as string[]).includes(String(node.currentVersionId))) return false
      if (node.taskId !== null) {
        const task = tasksById[String(node.taskId)] as Record<string, unknown> | undefined
        if (!task || task.nodeId !== id || task.resultNodeId !== id) return false
      }
    }
    for (const [id, rawTask] of Object.entries(tasksById)) {
      const task = rawTask as unknown as Record<string, unknown>
      const result = nodesById[String(task.resultNodeId)] as Record<string, unknown> | undefined
      if (!result || task.nodeId !== task.resultNodeId || result.taskId !== id) return false
      const request = task.request as Record<string, unknown>
      if (request.contentType !== result.type) return false
    }
  }

  if (schemaVersion === 4) {
    if (!isRecord(value.editorDraftsBySourceId)) return false
    for (const [sourceNodeId, rawDraft] of Object.entries(value.editorDraftsBySourceId)) {
      if (!isId(sourceNodeId) || !isRecord(rawDraft) || rawDraft.sourceNodeId !== sourceNodeId
        || !isOneOf(rawDraft.mode, ['clip', 'crop', 'splice', 'segment'])
        || !isFiniteNumber(rawDraft.durationSeconds) || Number(rawDraft.durationSeconds) <= 0
        || !isEditorState(rawDraft) || Number(rawDraft.outPoint) > Number(rawDraft.durationSeconds)
        || !Array.isArray(rawDraft.undoStack) || !rawDraft.undoStack.every(isEditorState)
        || !Array.isArray(rawDraft.redoStack) || !rawDraft.redoStack.every(isEditorState)
        || typeof rawDraft.dirty !== 'boolean' || !isString(rawDraft.updatedAt)) return false
      if (!Object.hasOwn(nodesById, sourceNodeId) || rawDraft.clipNodeIds.some((id) => !Object.hasOwn(nodesById, id))) return false
      if (Object.keys(rawDraft).some((key) => /url/i.test(key))) return false
    }
    for (const rawGroup of Object.values(groupsById)) {
      const group = rawGroup as Record<string, unknown>
      if ((group.nodeIds as string[]).some((id) => !Object.hasOwn(nodesById, id))) return false
    }
    for (const rawTask of Object.values(tasksById)) {
      const task = rawTask as Record<string, unknown>
      const request = task.request as Record<string, unknown>
      if (request.operation !== undefined) {
        const operation = request.operation as Record<string, unknown>
        if (operation.sourceNodeId !== task.sourceNodeId || request.branchId === undefined) return false
      }
    }
  }

  return isOrder(value.nodeOrder, nodesById) && isOrder(value.edgeOrder, edgesById)
    && isOrder(value.versionOrder, versionsById) && isOrder(value.groupOrder, groupsById)
}

const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'source-missing', 'interrupted'])

function migrateNode(node: CanvasNodeEntityV2): CanvasNodeEntityV3 {
  return { ...node, input: createEmptyNodeInput() }
}

function migrateTask(task: CanvasTaskV2, nodesById: Record<string, CanvasNodeEntityV3>): CanvasTask {
  const node = nodesById[task.nodeId]
  return {
    ...task,
    status: terminalStatuses.has(task.status) ? task.status : 'interrupted',
    sourceNodeId: task.nodeId,
    resultNodeId: task.nodeId,
    request: {
      contentType: node?.type ?? 'text', prompt: node?.input?.prompt ?? '', referenceNodeIds: [],
      voiceTargetNodeId: null, generationConfig: null,
    },
    attempt: 1,
  }
}

function interruptTasks(snapshot: CanvasSnapshot): CanvasSnapshot {
  let changed = false
  const tasksById = Object.fromEntries(Object.entries(snapshot.tasksById).map(([id, task]) => {
    if (terminalStatuses.has(task.status)) return [id, task]
    changed = true
    return [id, { ...task, status: 'interrupted' as const }]
  }))
  return changed ? { ...snapshot, tasksById } : snapshot
}

export function migrateCanvasSnapshot(value: unknown, fallback: CanvasSnapshot): SnapshotParseResult {
  if (isRecord(value) && typeof value.schemaVersion === 'number'
    && value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3 && value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { status: 'recovered', snapshot: fallback, reason: 'unsupported-version' }
  }
  if (!isRecord(value) || !isSnapshot(value)) {
    return { status: 'recovered', snapshot: fallback, reason: 'corrupt-json' }
  }
  if (value.schemaVersion === CURRENT_SCHEMA_VERSION) return { status: 'loaded', snapshot: interruptTasks(value) }

  if (value.schemaVersion === 3) return {
    status: 'loaded',
    snapshot: interruptTasks({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION, editorDraftsBySourceId: {} }),
  }

  const v2Nodes = Object.fromEntries(Object.entries(value.nodesById).map(([id, node]) => [
    id,
    value.schemaVersion === 1
      ? { ...node, locked: false, display: getDefaultNodeDisplay(node.type) }
      : node,
  ])) as Record<string, CanvasNodeEntityV2>
  const nodesById = Object.fromEntries(Object.entries(v2Nodes).map(([id, node]) => [id, migrateNode(node)]))

  return {
    status: 'loaded',
    snapshot: {
      ...value,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      nodesById,
      tasksById: Object.fromEntries(Object.entries(value.tasksById).map(([id, task]) => [id, migrateTask(task, nodesById)])),
      editorDraftsBySourceId: {},
    },
  }
}
