import { useState } from 'react'
import type { VideoGenerationConfig } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { cancelGeneration, startGeneration } from './runGeneration'
import { TaskStatusPanel } from './TaskStatusPanel'

const defaults: VideoGenerationConfig = { kind: 'video', model: 'Maolong Video', aspectRatio: '16:9', resolution: '720p', durationSeconds: 5, audio: 'none' }
const choices = {
  aspectRatio: ['1:1', '9:16', '3:4', '16:9', '4:3'], resolution: ['720p', '1080p'], durationSeconds: [5, 10],
  audio: [['none', '无声音'], ['generate', '生成声音'], ['voice-target', '目标音色']],
} as const

export function VideoGenerationPanel({ nodeId }: { nodeId: string }) {
  const node = useCanvasSessionStore((state) => state.snapshot.nodesById[nodeId])
  const latestTask = useCanvasSessionStore((state) => [...Object.values(state.snapshot.tasksById)].reverse().find((task) => task.sourceNodeId === nodeId))
  const persisted = node?.input?.generationConfig?.kind === 'video' ? node.input.generationConfig : defaults
  const [scenario, setScenario] = useState<'success' | 'failure'>('success')
  const update = <K extends keyof VideoGenerationConfig>(key: K, value: VideoGenerationConfig[K]) => {
    useCanvasSessionStore.getState().executeCommand({ type: 'set-generation-config', nodeId, config: { ...persisted, [key]: value }, now: new Date().toISOString() })
  }
  const promptValid = Boolean(node?.input?.prompt.trim() || node?.input?.referenceNodeIds.length)
  const voiceValid = persisted.audio !== 'voice-target' || Boolean(node?.input?.voiceTargetNodeId)
  return <section className="generation-panel" aria-label="视频生成设置">
    <label>视频比例<select aria-label="视频比例" value={persisted.aspectRatio} onChange={(e) => update('aspectRatio', e.target.value as VideoGenerationConfig['aspectRatio'])}>{choices.aspectRatio.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label>视频分辨率<select aria-label="视频分辨率" value={persisted.resolution} onChange={(e) => update('resolution', e.target.value as VideoGenerationConfig['resolution'])}>{choices.resolution.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label>视频时长<select aria-label="视频时长" value={persisted.durationSeconds} onChange={(e) => update('durationSeconds', Number(e.target.value) as 5 | 10)}>{choices.durationSeconds.map((value) => <option key={value} value={value}>{value} 秒</option>)}</select></label>
    <label>视频声音<select aria-label="视频声音" value={persisted.audio} onChange={(e) => update('audio', e.target.value as VideoGenerationConfig['audio'])}>{choices.audio.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>模拟结果<select aria-label="模拟结果" value={scenario} onChange={(e) => setScenario(e.target.value as typeof scenario)}><option value="success">成功</option><option value="failure">失败</option></select></label>
    {!promptValid && <p className="generation-field-error">请输入 AI 指令或添加参考节点</p>}
    {!voiceValid && <p className="generation-field-error">请先选择目标音色</p>}
    <button type="button" className="canvas-node__control" disabled={!promptValid || !voiceValid} onClick={() => startGeneration(nodeId, persisted, scenario)}>生成视频</button>
    {latestTask?.id && <TaskStatusPanel taskId={latestTask.id} onCancel={(task) => cancelGeneration(task.id)}
      onRetry={(task) => task.request && startGeneration(nodeId, persisted, scenario, task.request, (task.attempt ?? 1) + 1)}
      onModify={() => useCanvasInteractionStore.getState().replaceSelection([nodeId])} />}
  </section>
}
