import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { CanvasSnapshot, ContentType, NodeRole, TaskStatus } from '../../domain/canvas/types'

export type CanvasNodeData = {
  nodeId: string
  contentType: ContentType
  role: NodeRole
  name: string
  locked: boolean
  expanded: boolean
  status: string
  disabledCopy: { content: string; assets: string; playback: string }
}

const statusLabels: Record<TaskStatus, string> = {
  idle: '等待内容', 'input-preparation': '准备输入', validation: '校验中',
  'asset-preparation': '准备资产', queued: '排队中', processing: '处理中',
  'result-upload': '保存结果中', completed: '已完成', failed: '失败',
  cancelled: '已取消', 'source-missing': '来源缺失', interrupted: '已中断',
}

function encodedId(id: string): string {
  // Fixed-width UTF-16 units preserve every legal domain string, including lone surrogates.
  return id.split('').map((unit) => unit.charCodeAt(0).toString(16).padStart(4, '0')).join('')
}

export function toFlowNodeId(domainId: string): string {
  return `node-${encodedId(domainId)}`
}

export function toFlowNodes(snapshot: CanvasSnapshot, selectedNodeIds: ReadonlySet<string>): Node<CanvasNodeData>[] {
  return snapshot.nodeOrder.map((id) => {
    const node = snapshot.nodesById[id]
    const selected = selectedNodeIds.has(id)
    const task = node.taskId === null ? undefined : snapshot.tasksById[node.taskId]
    return {
      id: toFlowNodeId(id), type: 'canvasNode', position: { ...node.position },
      width: node.display.width, height: node.display.height,
      measured: { width: node.display.width, height: node.display.height },
      style: { width: node.display.width, height: node.display.height },
      selected, draggable: !node.locked, connectable: !node.locked, deletable: !node.locked,
      data: {
        nodeId: id, contentType: node.type, role: node.role, name: node.name,
        locked: node.locked, expanded: selected && selectedNodeIds.size === 1,
        status: statusLabels[task?.status ?? 'idle'],
        disabledCopy: {
          content: '阶段三开放：内容与生成', assets: '阶段五开放：资产库', playback: '阶段四开放：媒体播放',
        },
      },
    }
  })
}

export function toFlowEdges(snapshot: CanvasSnapshot, selectedEdgeIds: ReadonlySet<string> = new Set()): Edge<{ edgeId: string }>[] {
  return snapshot.edgeOrder.map((id) => {
    const edge = snapshot.edgesById[id]
    const selected = selectedEdgeIds.has(id)
    return {
      id: `edge-${encodedId(id)}`, data: { edgeId: id },
      source: toFlowNodeId(edge.sourceNodeId), target: toFlowNodeId(edge.targetNodeId), sourceHandle: 'source', targetHandle: 'target',
      selected,
      ariaLabel: `连线${selected ? '（已选中）' : ''}`, ariaRole: 'button',
      domAttributes: { 'aria-pressed': selected },
      style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.Arrow },
    }
  })
}
