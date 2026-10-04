import type { CanvasSnapshot, CanvasTask, ContentType, TaskRequestSnapshot, TaskStatus } from '../../domain/canvas/types'

export interface GenerationTaskRequest {
  taskId: string
  resultNodeId: string
  contentType: ContentType
  request?: TaskRequestSnapshot
  scenario?: 'success' | 'failure'
  resultContent?: string
}

export interface TaskEvent {
  taskId: string
  resultNodeId: string
  status: Exclude<TaskStatus, 'idle'>
  updatedAt: string
  error?: string
  result?: { versionId: string; content: string }
}

export interface TaskHandle { cancel(): void }

export interface GenerationTaskRunner {
  start(request: GenerationTaskRequest, onEvent: (event: TaskEvent) => void): TaskHandle
}

export interface CanvasTaskRequest {
  nodeId: string
  snapshot: CanvasSnapshot
}

export interface CanvasTaskService {
  startTask(request: CanvasTaskRequest): Promise<CanvasTask>
  cancelTask(request: CanvasTaskRequest): Promise<CanvasTask>
  retryTask(request: CanvasTaskRequest): Promise<CanvasTask>
  generation: GenerationTaskRunner
}

export interface AssetLibraryItem {
  id: string
  name: string
  type: ContentType
  content: string | null
}

export interface AssetLibraryService {
  listAssets(): Promise<AssetLibraryItem[]>
}

export interface TemplateLibraryItem {
  id: string
  name: string
  snapshot: CanvasSnapshot
}

export interface TemplateLibraryService {
  listTemplates(): Promise<TemplateLibraryItem[]>
}

export interface EditorDraft {
  nodeId: string
  type: ContentType
  content: string | null
}

export type MediaExportResult =
  | { status: 'completed'; fileName: string; blob: Blob }
  | { status: 'failed'; error: string }
  | { status: 'interrupted'; fixtureId: string }

export interface MediaExportService {
  exportEditorDraft(draft: EditorDraft, snapshot: CanvasSnapshot): Promise<MediaExportResult>
}

export interface CanvasServices {
  tasks: CanvasTaskService
  assets: AssetLibraryService
  templates: TemplateLibraryService
  mediaExport: MediaExportService
}
