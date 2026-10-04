import { useId } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

const tools = [
  { name: '模板', symbol: '▦' },
  { name: '历史', symbol: '↶' },
  { name: '帮助', symbol: '?' },
]

export function CreateToolRail() {
  const laterDescriptionId = useId()
  const tool = useCanvasInteractionStore((state) => state.tool)
  const createMenu = useCanvasInteractionStore((state) => state.createMenu)
  const { screenToFlowPosition } = useReactFlow()
  return (
    <div className="create-tool-rail" role="toolbar" aria-label="创作工具" aria-orientation="vertical">
      <button
        type="button" aria-label="添加节点" title="添加节点" aria-haspopup="menu" aria-expanded={createMenu !== null}
        onClick={(event) => {
          const trigger = event.currentTarget
          const canvas = trigger.closest('main')?.querySelector('.canvas-surface')
          if (!canvas) return
          const bounds = canvas.getBoundingClientRect()
          const rail = trigger.parentElement!.getBoundingClientRect()
          const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
          useCanvasInteractionStore.getState().openCreateMenu(
            { x: rail.right + 8, y: trigger.getBoundingClientRect().top }, screenToFlowPosition(center), trigger,
          )
        }}
      ><span aria-hidden="true">+</span></button>
      {([
        { value: 'select', name: '鼠标选择', symbol: '↖' }, { value: 'pan', name: '抓手', symbol: '✋' },
      ] as const).map((item) => (
        <button
          key={item.value} type="button" aria-label={item.name} aria-pressed={tool === item.value}
          title={`${item.name}${tool === item.value ? '（当前工具）' : ''}`}
          onClick={() => useCanvasInteractionStore.getState().setTool(item.value)}
        >
          <span aria-hidden="true">{item.symbol}</span>
          {tool === item.value && <span className="tool-active-marker" aria-hidden="true">✓</span>}
        </button>
      ))}
      <button type="button" aria-label="剪辑" title="剪辑" onClick={() => {
        const state = useCanvasInteractionStore.getState()
        const selected = [...state.selectedNodeIds]
        const sourceId = selected.length === 1 && useCanvasSessionStore.getState().snapshot.nodesById[selected[0]]?.type === 'video' ? selected[0] : null
        if (!sourceId) { state.announce('请先选择一个视频节点'); return }
        state.openEditor(sourceId, 'clip')
      }}><span aria-hidden="true">✂</span></button>
      {tools.map((tool) => (
        <button
          key={tool.name}
          type="button"
          aria-label={tool.name}
          title={tool.name}
          disabled
          aria-describedby={laterDescriptionId}
        >
          <span aria-hidden="true">{tool.symbol}</span>
        </button>
      ))}
      <span id={laterDescriptionId} hidden>后续阶段开放</span>
    </div>
  )
}
