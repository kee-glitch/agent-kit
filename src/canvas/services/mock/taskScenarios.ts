import type { GenerationTaskRequest, GenerationTaskRunner, TaskEvent, TaskHandle } from '../contracts/canvasServices'

export type TaskScenario = 'success' | 'failure'
type Schedule = (callback: () => void, delay: number) => () => void

const statuses = ['input-preparation', 'validation', 'asset-preparation', 'queued', 'processing', 'result-upload', 'completed'] as const

export function createTaskScenarioRunner(options: {
  scenario: TaskScenario
  now: () => string
  schedule: Schedule
  failureStage?: 'validation' | 'processing' | 'result-upload'
}): GenerationTaskRunner {
  return {
    start(request: GenerationTaskRequest, onEvent: (event: TaskEvent) => void): TaskHandle {
      let terminal = false
      const cancellations: (() => void)[] = []
      const failureStage = options.failureStage ?? 'processing'
      for (const [index, status] of statuses.entries()) {
        cancellations.push(options.schedule(() => {
          if (terminal) return
          if ((request.scenario ?? options.scenario) === 'failure' && status === failureStage) {
            terminal = true
            onEvent({ ...request, status: 'failed', updatedAt: options.now(), error: '模拟生成失败，可修改参数或重试' })
            return
          }
          if (status === 'completed') terminal = true
          onEvent({ ...request, status, updatedAt: options.now(), ...(status === 'completed' ? {
            result: { versionId: `${request.taskId}-version`, content: request.resultContent ?? (request.contentType === 'image'
              ? '/fixtures/generated-image.svg' : request.contentType === 'audio'
                ? '/fixtures/generated-audio-waveform.svg' : request.contentType === 'text'
                  ? '确定性媒体分析结果' : '/fixtures/generated-video.mp4') },
          } : {}) })
        }, index * 180))
      }
      return {
        cancel() {
          if (terminal) return
          terminal = true
          cancellations.forEach((cancel) => cancel())
          onEvent({ ...request, status: 'cancelled', updatedAt: options.now() })
        },
      }
    },
  }
}

export function createBrowserSchedule(): Schedule {
  return (callback, delay) => {
    const id = window.setTimeout(callback, delay)
    return () => window.clearTimeout(id)
  }
}
