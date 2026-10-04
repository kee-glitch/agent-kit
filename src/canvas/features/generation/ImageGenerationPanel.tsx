import { useState } from 'react'
import type { ImageGenerationConfig } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { cancelGeneration, startGeneration } from './runGeneration'
import { TaskStatusPanel } from './TaskStatusPanel'

const defaults: ImageGenerationConfig = { kind: 'image', model: 'Maolong Image', aspectRatio: 'auto', resolution: '1K', quality: 'standard', format: 'PNG' }
const options = {
  aspectRatio: [['auto', '自动'], ['1:1', '1:1'], ['9:16', '9:16'], ['3:4', '3:4'], ['16:9', '16:9'], ['4:3', '4:3']],
  resolution: [['1K', '1K'], ['2K', '2K'], ['4K', '4K']], quality: [['standard', '标准'], ['high', '高']], format: [['PNG', 'PNG'], ['JPEG', 'JPEG']],
} as const

export function ImageGenerationPanel({ nodeId }: { nodeId: string }) {
  const node = useCanvasSessionStore((state) => state.snapshot.nodesById[nodeId])
  const latestTask = useCanvasSessionStore((state) => [...Object.values(state.snapshot.tasksById)].reverse().find((task) => task.sourceNodeId === nodeId))
  const persisted = node?.input?.generationConfig?.kind === 'image' ? node.input.generationConfig : defaults
  const [scenario, setScenario] = useState<'success' | 'failure'>('success')
  const update = <K extends keyof ImageGenerationConfig>(key: K, value: ImageGenerationConfig[K]) => {
    useCanvasSessionStore.getState().executeCommand({ type: 'set-generation-config', nodeId, config: { ...persisted, [key]: value }, now: new Date().toISOString() })
  }
  const valid = Boolean(node?.input?.prompt.trim() || node?.input?.referenceNodeIds.length)
  const submit = () => startGeneration(nodeId, persisted, scenario)
  return <section className="generation-panel" aria-label="图片生成设置">
    <label>图片比例<select aria-label="图片比例" value={persisted.aspectRatio} onChange={(e) => update('aspectRatio', e.target.value as ImageGenerationConfig['aspectRatio'])}>{options.aspectRatio.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>图片分辨率<select aria-label="图片分辨率" value={persisted.resolution} onChange={(e) => update('resolution', e.target.value as ImageGenerationConfig['resolution'])}>{options.resolution.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>图片质量<select aria-label="图片质量" value={persisted.quality} onChange={(e) => update('quality', e.target.value as ImageGenerationConfig['quality'])}>{options.quality.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>图片格式<select aria-label="图片格式" value={persisted.format} onChange={(e) => update('format', e.target.value as ImageGenerationConfig['format'])}>{options.format.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>模拟结果<select aria-label="模拟结果" value={scenario} onChange={(e) => setScenario(e.target.value as typeof scenario)}><option value="success">成功</option><option value="failure">失败</option></select></label>
    {!valid && <p className="generation-field-error">请输入 AI 指令或添加参考节点</p>}
    <button type="button" className="canvas-node__control" disabled={!valid} onClick={submit}>生成图片</button>
    {latestTask?.id && <TaskStatusPanel taskId={latestTask.id} onCancel={(task) => cancelGeneration(task.id)}
      onRetry={(task) => task.request && startGeneration(nodeId, persisted, scenario, task.request, (task.attempt ?? 1) + 1)}
      onModify={() => useCanvasInteractionStore.getState().replaceSelection([nodeId])} />}
  </section>
}
