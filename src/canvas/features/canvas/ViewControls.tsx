import { useId, useState } from 'react'
import { MiniMap, useReactFlow, useViewport, type MiniMapNodeProps, type Node } from '@xyflow/react'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import type { CanvasNodeData } from './canvasAdapters'

function CanvasMiniMapNode({ id, x, y, width, height, selected }: MiniMapNodeProps) {
  const { getNode } = useReactFlow<Node<CanvasNodeData>>()
  const data = getNode(id)?.data
  if (!data) return null
  const label = { text: '文本', image: '图片', video: '视频', audio: '音频' }[data.contentType]
  return (
    <g className="canvas-minimap-node" data-id={id} data-selected={selected} role="img"
      aria-label={`${data.name} · ${label}节点${data.locked ? ' · 已锁定' : ''}`} transform={`translate(${x},${y})`}>
      {data.contentType === 'audio' ? <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} />
        : data.contentType === 'video' ? <polygon points={`0,0 ${width * 0.8},0 ${width},${height / 2} ${width * 0.8},${height} 0,${height}`} />
          : <rect width={width} height={height} rx={data.contentType === 'image' ? 24 : 0} />}
      <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(width / 5, height / 3)}>{label}</text>
    </g>
  )
}

function transitionOptions() {
  return { duration: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 200 }
}

export function ViewControls() {
  const { zoomIn, zoomOut, setViewport, fitView, getViewport } = useReactFlow()
  const { zoom } = useViewport()
  const [minimapOpen, setMinimapOpen] = useState(false)
  const minimapId = useId()

  function autoLayout() {
    if (useCanvasSessionStore.getState().executeCommand({ type: 'auto-layout', now: new Date().toISOString() })) {
      useCanvasInteractionStore.getState().announce('已自动整理卡片')
    }
  }

  async function resetView() {
    const before = getViewport()
    const hasNodes = useCanvasSessionStore.getState().snapshot.nodeOrder.length > 0
    if (!hasNodes && before.x === 0 && before.y === 0 && before.zoom === 1) return
    const accepted = hasNodes ? await fitView(transitionOptions()) : await setViewport({ x: 0, y: 0, zoom: 1 }, transitionOptions())
    const after = getViewport()
    if (accepted && (before.x !== after.x || before.y !== after.y || before.zoom !== after.zoom)) {
      useCanvasInteractionStore.getState().announce(hasNodes ? '已适配画布内容' : '已重置空画布视图')
    }
  }

  return (
    <>
      {minimapOpen && <div id={minimapId} className="canvas-minimap">
        <MiniMap ariaLabel="小地图：节点类型与当前视口" nodeComponent={CanvasMiniMapNode}
          style={{ width: 240, height: 160 }} maskStrokeColor="var(--text-primary)" maskStrokeWidth={2} />
      </div>}
      <div className="view-controls" role="toolbar" aria-label="视图控制">
        <button type="button" aria-label="小地图" title="小地图" aria-expanded={minimapOpen} aria-controls={minimapId}
          onClick={() => setMinimapOpen((open) => !open)}>
          <span aria-hidden="true">▧</span>
        </button>
        <button type="button" aria-label="自动整理卡片" title="自动整理卡片" onClick={autoLayout}>
          <span aria-hidden="true">⇄</span>
        </button>
        <button type="button" aria-label="缩小" title="缩小" onClick={() => void zoomOut(transitionOptions())}>
          <span aria-hidden="true">−</span>
        </button>
        <output aria-label="当前缩放比例">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="放大" title="放大" onClick={() => void zoomIn(transitionOptions())}>
          <span aria-hidden="true">+</span>
        </button>
        <button type="button" aria-label="重置" onClick={() => void resetView()}>重置</button>
      </div>
    </>
  )
}
