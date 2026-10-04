import type { CanvasTask } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

const labels: Record<string, string> = {
  idle: '准备生成', 'input-preparation': '正在准备输入', validation: '正在校验参数', 'asset-preparation': '正在准备素材',
  queued: '已进入队列', processing: '正在生成', 'result-upload': '正在写入结果', completed: '生成完成', failed: '生成失败',
  cancelled: '生成已取消', interrupted: '生成已中断，可按原配置重试', 'source-missing': '来源节点已不存在，请返回画布重新选择来源',
}

export function TaskStatusPanel({ taskId, onCancel, onRetry, onModify }: {
  taskId: string
  onCancel: (task: CanvasTask) => void
  onRetry: (task: CanvasTask) => void
  onModify: (task: CanvasTask) => void
}) {
  const task = useCanvasSessionStore((state) => state.snapshot.tasksById[taskId])
  const sourceExists = useCanvasSessionStore((state) => {
    const sourceId = state.snapshot.tasksById[taskId]?.sourceNodeId
    return Boolean(sourceId && state.snapshot.nodesById[sourceId])
  })
  const content = useCanvasSessionStore((state) => {
    const resultId = state.snapshot.tasksById[taskId]?.resultNodeId
    const versionId = resultId ? state.snapshot.nodesById[resultId]?.currentVersionId : null
    return versionId ? state.snapshot.versionsById[versionId]?.content : null
  })
  if (!task) return null
  const visibleStatus = sourceExists ? task.status : 'source-missing'
  const running = ['idle', 'input-preparation', 'validation', 'asset-preparation', 'queued', 'processing', 'result-upload'].includes(task.status)
  const retryable = sourceExists && ['failed', 'interrupted', 'cancelled'].includes(task.status)
  return <section className="generation-status" aria-label="生成任务状态">
    <p role="status">{labels[visibleStatus]}</p>
    {task.error && <p className="generation-field-error">{task.error}</p>}
    {task.status === 'completed' && content && task.request?.contentType === 'image' && <img src={content} alt="生成图片预览" />}
    {task.status === 'completed' && content && task.request?.contentType === 'video' && <video src={content} controls aria-label="生成视频预览" />}
    <div className="canvas-node__controls">
      {sourceExists && running && <button type="button" className="canvas-node__control" onClick={() => onCancel(task)}>取消生成</button>}
      {retryable && <button type="button" className="canvas-node__control" onClick={() => onRetry(task)}>原配置重试</button>}
      {retryable && <button type="button" className="canvas-node__control" onClick={() => onModify(task)}>修改参数</button>}
    </div>
  </section>
}
