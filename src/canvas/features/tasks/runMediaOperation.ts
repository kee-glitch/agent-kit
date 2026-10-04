import type { ContentType } from '../../domain/canvas/types'
import type { CanvasServices, TaskHandle } from '../../services/contracts/canvasServices'
import { applyGenerationTaskEvent } from './runGenerationTask'

export interface MediaOperationBranch {
  branchId: string
  taskId: string
  resultNodeId: string
  contentType: ContentType
}

const handles = new Map<string, TaskHandle>()
const fixtures: Record<ContentType, string> = {
  text: '确定性媒体分析结果',
  image: '/fixtures/processed-image.svg',
  video: '/fixtures/processed-video-poster.svg',
  audio: '/fixtures/generated-audio-waveform.svg',
}

export function runMediaOperation(
  manifest: MediaOperationBranch[],
  services: CanvasServices,
  scenarioByBranch: Record<string, 'success' | 'failure'>,
): string[] {
  return manifest.map((branch) => {
    const handle = services.tasks.generation.start({
      taskId: branch.taskId, resultNodeId: branch.resultNodeId, contentType: branch.contentType,
      scenario: scenarioByBranch[branch.branchId] ?? 'success', resultContent: fixtures[branch.contentType],
    }, (event) => {
      applyGenerationTaskEvent(event)
      if (['completed', 'failed', 'cancelled'].includes(event.status)) handles.delete(branch.taskId)
    })
    handles.set(branch.taskId, handle)
    return branch.taskId
  })
}

export function cancelMediaOperationBranch(taskId: string): void {
  handles.get(taskId)?.cancel()
  handles.delete(taskId)
}
