import type { CanvasTask } from '../../domain/canvas/types'
import type { CanvasServices, CanvasTaskRequest } from '../contracts/canvasServices'
import { createBrowserSchedule, createTaskScenarioRunner, type TaskScenario } from './taskScenarios'

export interface MockCanvasServiceOptions {
  fixtureId?: string
  scenario?: TaskScenario
  now?: () => string
}

const assets = [
  { id: 'asset-image-product', name: '产品参考图', type: 'image' as const, content: '/fixtures/asset-image.svg' },
  { id: 'asset-video-city', name: '城市镜头', type: 'video' as const, content: '/fixtures/generated-video.mp4' },
  { id: 'asset-audio-voice', name: '清朗人声', type: 'audio' as const, content: '/fixtures/sample-audio.wav' },
]

export function createMockCanvasServices(options: MockCanvasServiceOptions = {}): CanvasServices {
  const fixtureId = options.fixtureId ?? 'mock-task'
  const generation = createTaskScenarioRunner({
    scenario: options.scenario ?? 'success',
    now: options.now ?? (() => new Date().toISOString()),
    schedule: createBrowserSchedule(),
  })
  const interruptedTask = async ({ nodeId, snapshot }: CanvasTaskRequest): Promise<CanvasTask> => ({
    id: fixtureId,
    nodeId,
    status: 'interrupted',
    createdAt: snapshot.canvas.updatedAt,
    updatedAt: snapshot.canvas.updatedAt,
    error: 'Phase one mock service does not execute tasks.',
  })

  return {
    tasks: {
      startTask: interruptedTask,
      cancelTask: interruptedTask,
      retryTask: interruptedTask,
      generation,
    },
    assets: { listAssets: async () => assets.map((asset) => ({ ...asset })) },
    templates: { listTemplates: async () => [] },
    mediaExport: {
      exportEditorDraft: async () => ({ fixtureId, status: 'interrupted' }),
    },
  }
}
