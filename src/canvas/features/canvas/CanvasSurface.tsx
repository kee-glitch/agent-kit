import { useCallback, useMemo, useRef, useState } from 'react'
import { Background, BackgroundVariant, ReactFlow, useReactFlow, ViewportPortal, type Connection } from '@xyflow/react'
import { getDefaultNodeDisplay } from '../../domain/canvas/migrateSnapshot'
import { validateConnection } from '../../domain/canvas/connectionRules'
import type { ContentType } from '../../domain/canvas/types'
import { selectCanRedo, selectCanUndo, updateViewport, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { nodeTypes } from '../nodes/nodeTypes'
import { toFlowEdges, toFlowNodeId, toFlowNodes } from './canvasAdapters'
import { NodeCreateMenu } from './NodeCreateMenu'
import { DeleteSelectionDialog } from './DeleteSelectionDialog'
import { useCanvasKeyboard } from './useCanvasKeyboard'
import { ActiveMediaEditor } from '../media-editor/ActiveMediaEditor'
import { ProcessingResultStatus } from '../processing/ProcessingResultStatus'

const defaultNames: Record<ContentType, string> = { text: '文本节点', image: '图片节点', video: '视频节点', audio: '音频节点' }

export function CanvasSurface() {
  const snapshot = useCanvasSessionStore((state) => state.snapshot)
  const canUndo = useCanvasSessionStore(selectCanUndo)
  const canRedo = useCanvasSessionStore(selectCanRedo)
  const tool = useCanvasInteractionStore((state) => state.tool)
  const selectedNodeIds = useCanvasInteractionStore((state) => state.selectedNodeIds)
  const selectedEdgeIds = useCanvasInteractionStore((state) => state.selectedEdgeIds)
  const nodePreviewPositions = useCanvasInteractionStore((state) => state.nodePreviewPositions)
  const announcement = useCanvasInteractionStore((state) => state.announcement)
  const createMenu = useCanvasInteractionStore((state) => state.createMenu)
  const { screenToFlowPosition } = useReactFlow()
  const [creationResult, setCreationResult] = useState({ count: 0, name: '' })
  const [dragPositions, setDragPositions] = useState<Map<string, { x: number; y: number }>>(() => new Map())
  const boxSelecting = useRef(false)
  const canvasRef = useRef<HTMLElement>(null)
  const [deleteRequest, setDeleteRequest] = useState<{ ids: string[]; trigger: HTMLElement } | null>(null)
  const [connectionFeedback, setConnectionFeedback] = useState<{ anchor: { x: number; y: number }; reason: string; count: number } | null>(null)
  const requestDeletion = useCallback((trigger: HTMLElement) => {
    const interaction = useCanvasInteractionStore.getState()
    if (interaction.selectedEdgeIds.size > 0) {
      const session = useCanvasSessionStore.getState()
      const ids = [...interaction.selectedEdgeIds].filter((id) => Object.hasOwn(session.snapshot.edgesById, id))
      canvasRef.current?.focus({ preventScroll: true })
      const accepted = session.executeCommand({ type: 'delete-edge', edgeIds: ids, now: new Date().toISOString() })
      interaction.clearSelection()
      interaction.announce(accepted ? `已删除 ${ids.length} 条关系；节点已保留` : '没有可删除的关系')
      return
    }
    setDeleteRequest({ ids: [...interaction.selectedNodeIds], trigger: trigger === document.body ? canvasRef.current ?? trigger : trigger })
  }, [])
  useCanvasKeyboard({ onDeleteRequest: requestDeletion, enabled: !deleteRequest && !createMenu })
  const domainNodeIds = useMemo(() => new Map(snapshot.nodeOrder.map((id) => [toFlowNodeId(id), id])), [snapshot.nodeOrder])
  const deletionNodes = deleteRequest?.ids.filter((id) => Object.hasOwn(snapshot.nodesById, id)) ?? []
  const eligibleNodes = deletionNodes.filter((id) => !snapshot.nodesById[id].locked)
  const lockedCount = deletionNodes.length - eligibleNodes.length
  const deletionTriggerFlowId = deleteRequest?.trigger.closest('.react-flow__node')?.getAttribute('data-id')
  const deletionTriggerNodeId = deletionTriggerFlowId ? domainNodeIds.get(deletionTriggerFlowId) : undefined
  const deletionFallback = deletionTriggerNodeId && eligibleNodes.includes(deletionTriggerNodeId) ? canvasRef.current : null
  const incidentEdgeCount = snapshot.edgeOrder.filter((id) => eligibleNodes.includes(snapshot.edgesById[id].sourceNodeId)
    || eligibleNodes.includes(snapshot.edgesById[id].targetNodeId)).length
  const nodes = useMemo(() => toFlowNodes(snapshot, selectedNodeIds).map((node) => ({
    ...node, position: nodePreviewPositions.get(node.data.nodeId) ?? dragPositions.get(node.data.nodeId) ?? node.position,
    draggable: tool === 'select' && node.draggable, selectable: tool === 'select', connectable: tool === 'select' && node.connectable, deletable: false,
  })), [snapshot, selectedNodeIds, nodePreviewPositions, dragPositions, tool])
  const edges = useMemo(() => toFlowEdges(snapshot, selectedEdgeIds).map((edge) => ({
    ...edge, selectable: tool === 'select', focusable: tool === 'select', deletable: false,
    domAttributes: { ...edge.domAttributes,
      'aria-keyshortcuts': 'Enter Space Delete Backspace',
      onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
        if (tool !== 'select' || event.altKey || event.ctrlKey || event.metaKey) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectEdge(edge.data!.edgeId, event.shiftKey)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          useCanvasInteractionStore.getState().clearSelection()
          canvasRef.current?.focus({ preventScroll: true })
        }
      },
    },
  })), [snapshot, selectedEdgeIds, tool])

  function selectEdge(id: string, multiple: boolean) {
    const interaction = useCanvasInteractionStore.getState()
    if (multiple) interaction.toggleEdgeSelection(id)
    else interaction.replaceEdgeSelection([id])
  }

  function restoreHistory(isRedo: boolean) {
    const session = useCanvasSessionStore.getState()
    if ((isRedo ? session.redo : session.undo)()) {
      const interaction = useCanvasInteractionStore.getState()
      const current = useCanvasSessionStore.getState().snapshot
      if (interaction.selectedEdgeIds.size > 0) interaction.replaceEdgeSelection([...interaction.selectedEdgeIds].filter((id) => Object.hasOwn(current.edgesById, id)))
      else interaction.replaceSelection([...interaction.selectedNodeIds].filter((id) => Object.hasOwn(current.nodesById, id)))
      interaction.announce(isRedo ? '已重做画布操作' : '已撤销画布操作')
    }
  }

  function showConnectionReason(anchor: { x: number; y: number }, reason: string) {
    setConnectionFeedback((previous) => ({ anchor, reason, count: (previous?.count ?? 0) + 1 }))
  }

  function connectionAnchor(targetId: string) {
    const target = [...canvasRef.current?.querySelectorAll<HTMLElement>('.react-flow__handle.target') ?? []]
      .find((handle) => handle.getAttribute('data-nodeid') === toFlowNodeId(targetId))
    const rect = target?.getBoundingClientRect()
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    return { x: rect?.right ?? canvasRect?.left ?? 8, y: rect?.top ?? canvasRect?.top ?? 8 }
  }

  function createConnection(connection: Connection) {
    const sourceId = domainNodeIds.get(connection.source)
    const targetId = domainNodeIds.get(connection.target)
    if (sourceId === undefined || targetId === undefined) return
    const current = useCanvasSessionStore.getState().snapshot
    const anchor = connectionAnchor(targetId)
    const relationType = current.nodesById[sourceId].type === 'text' ? 'instruction' : 'reference'
    const validation = validateConnection(current, sourceId, targetId, relationType)
    if (!validation.ok) showConnectionReason(anchor, validation.reason)
    else if (useCanvasSessionStore.getState().executeCommand({ type: 'create-edge', now: new Date().toISOString(), edge: {
      id: crypto.randomUUID(), sourceNodeId: sourceId, targetNodeId: targetId, relationType, sourceVersionId: null,
    } })) {
      setConnectionFeedback(null)
      useCanvasInteractionStore.getState().closeCreateMenu()
      useCanvasInteractionStore.getState().announce('已创建连线')
    } else showConnectionReason(anchor, '关系未创建，请重新连接')
    canvasRef.current?.focus({ preventScroll: true })
  }

  function confirmDeletion() {
    if (!deleteRequest) return
    const { executeCommand } = useCanvasSessionStore.getState()
    if (executeCommand({ type: 'delete-selection', nodeIds: deleteRequest.ids, edgeIds: [], now: new Date().toISOString() })) {
      const interaction = useCanvasInteractionStore.getState()
      const current = useCanvasSessionStore.getState().snapshot
      interaction.replaceSelection([...interaction.selectedNodeIds].filter((id) => Object.hasOwn(current.nodesById, id)))
      interaction.announce(`已删除 ${eligibleNodes.length} 个节点及 ${incidentEdgeCount} 条关联关系${lockedCount > 0 ? `；保留 ${lockedCount} 个锁定节点` : ''}`)
    }
    setDeleteRequest(null)
  }

  function finishDrag(movedNodes: typeof nodes) {
    const current = useCanvasSessionStore.getState().snapshot
    const moved = movedNodes.filter((node) => Object.hasOwn(current.nodesById, node.data.nodeId) && !current.nodesById[node.data.nodeId].locked
      && (node.position.x !== current.nodesById[node.data.nodeId].position.x || node.position.y !== current.nodesById[node.data.nodeId].position.y))
    if (useCanvasSessionStore.getState().executeCommand({ type: 'move-nodes', positions: Object.fromEntries(moved.map((node) => [node.data.nodeId, { ...node.position }])), now: new Date().toISOString() })) {
      useCanvasInteractionStore.getState().announce(`已移动 ${moved.length} 个节点`)
    }
    setDragPositions(new Map())
  }

  function createNode(type: ContentType) {
    const { createMenu, replaceSelection } = useCanvasInteractionStore.getState()
    if (!createMenu) return
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const accepted = useCanvasSessionStore.getState().executeCommand({
      type: 'create-node',
      node: {
        id, type, role: 'blank', name: defaultNames[type], position: { ...createMenu.flowPosition },
        locked: false, display: getDefaultNodeDisplay(type), versionIds: [], currentVersionId: null,
        taskId: null, createdAt: now, updatedAt: now,
      },
    })
    if (accepted) {
      if (createMenu.sourceNodeId && Object.hasOwn(useCanvasSessionStore.getState().snapshot.nodesById, createMenu.sourceNodeId)) {
        const relationType = useCanvasSessionStore.getState().snapshot.nodesById[createMenu.sourceNodeId].type === 'text' ? 'instruction' : 'reference'
        useCanvasSessionStore.getState().executeCommand({ type: 'create-edge', now, edge: {
          id: crypto.randomUUID(), sourceNodeId: createMenu.sourceNodeId, targetNodeId: id, relationType, sourceVersionId: null,
        } })
      }
      replaceSelection([id])
      setCreationResult((previous) => ({ count: previous.count + 1, name: defaultNames[type] }))
    }
  }

  return (
    <section
      ref={canvasRef}
      className="canvas-surface" aria-label="无限画布" tabIndex={-1} data-tool={tool}
      onDoubleClick={(event) => {
        const target = event.target
        if (!(target instanceof Element) || target.closest('.react-flow__node, .react-flow__edge')
          || !target.closest('.react-flow__pane')) return
        const anchor = { x: event.clientX, y: event.clientY }
        useCanvasInteractionStore.getState().openCreateMenu(anchor, screenToFlowPosition(anchor), event.currentTarget)
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={snapshot.viewport}
        colorMode="light"
        panOnDrag={tool === 'pan' ? true : [1]}
        nodesDraggable={tool === 'select'}
        autoPanOnNodeDrag={false}
        autoPanOnSelection={false}
        nodesConnectable={tool === 'select'}
        autoPanOnConnect={false}
        onConnect={createConnection}
        onConnectEnd={(event, state) => {
          if (state.isValid || !state.fromNode) return
          if (!state.toNode && state.fromHandle.type === 'source') {
            const sourceId = domainNodeIds.get(state.fromNode.id)
            if (sourceId === undefined || !canvasRef.current) return
            const anchor = event instanceof MouseEvent
              ? { x: event.clientX, y: event.clientY }
              : { x: event.changedTouches[0]?.clientX ?? 0, y: event.changedTouches[0]?.clientY ?? 0 }
            const flowPosition = screenToFlowPosition(anchor)
            const trigger = canvasRef.current
            window.setTimeout(() => {
              if (Object.hasOwn(useCanvasSessionStore.getState().snapshot.nodesById, sourceId)) {
                useCanvasInteractionStore.getState().openCreateMenu(anchor, flowPosition, trigger, sourceId)
              }
            }, 0)
            return
          }
          if (!state.toNode) return
          const reversed = state.fromHandle.type === 'target'
          const sourceId = domainNodeIds.get(reversed ? state.toNode.id : state.fromNode.id)
          const targetId = domainNodeIds.get(reversed ? state.fromNode.id : state.toNode.id)
          if (sourceId === undefined || targetId === undefined) return
          const validation = validateConnection(useCanvasSessionStore.getState().snapshot, sourceId, targetId, 'reference')
          if (!validation.ok) {
            showConnectionReason(connectionAnchor(targetId), validation.reason)
            canvasRef.current?.focus({ preventScroll: true })
          }
        }}
        elementsSelectable={tool === 'select'}
        selectionOnDrag={tool === 'select'}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        disableKeyboardA11y
        onEdgeClick={(event, edge) => {
          if (tool === 'select' && edge.data) selectEdge(edge.data.edgeId, event.shiftKey)
        }}
        onNodeClick={(event, node) => {
          if (tool !== 'select' || (event.target instanceof Element && event.target.closest('button, .react-flow__handle'))) return
          const interaction = useCanvasInteractionStore.getState()
          if (event.shiftKey) interaction.toggleSelection(node.data.nodeId)
          else interaction.replaceSelection([node.data.nodeId])
        }}
        onPaneClick={() => { if (tool === 'select') useCanvasInteractionStore.getState().clearSelection() }}
        onSelectionStart={() => {
          boxSelecting.current = true
          useCanvasInteractionStore.getState().clearSelection()
        }}
        onSelectionEnd={() => { boxSelecting.current = false }}
        onNodesChange={(changes) => {
          if (boxSelecting.current) {
            const ids = new Set(useCanvasInteractionStore.getState().selectedNodeIds)
            for (const change of changes) if (change.type === 'select') {
              const id = domainNodeIds.get(change.id)
              if (id === undefined) continue
              if (change.selected) ids.add(id)
              else ids.delete(id)
            }
            useCanvasInteractionStore.getState().replaceSelection([...ids])
          }
          const positions = new Map<string, { x: number; y: number }>()
          for (const change of changes) if (change.type === 'position' && change.position) {
            const id = domainNodeIds.get(change.id)
            if (id !== undefined && !snapshot.nodesById[id].locked) positions.set(id, { x: change.position.x, y: change.position.y })
          }
          if (positions.size > 0) setDragPositions((previous) => new Map([...previous, ...positions]))
        }}
        onNodeDragStart={(_event, node) => {
          const interaction = useCanvasInteractionStore.getState()
          if (!interaction.selectedNodeIds.has(node.data.nodeId)) interaction.replaceSelection([node.data.nodeId])
        }}
        onNodeDragStop={(_event, _node, moved) => finishDrag(moved)}
        onSelectionDragStop={(_event, moved) => finishDrag(moved)}
        deleteKeyCode={null}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        onMoveEnd={(_event, nextViewport) => {
          const current = useCanvasSessionStore.getState().snapshot.viewport
          if (current.x !== nextViewport.x || current.y !== nextViewport.y || current.zoom !== nextViewport.zoom) updateViewport(nextViewport)
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--grid-dot)" />
        <ViewportPortal>{snapshot.groupOrder.map((groupId) => {
          const group = snapshot.groupsById[groupId]
          const members = group.nodeIds.map((id) => snapshot.nodesById[id]).filter(Boolean)
          if (members.length === 0) return null
          const left = Math.min(...members.map((node) => node.position.x)) - 20
          const top = Math.min(...members.map((node) => node.position.y)) - 44
          const right = Math.max(...members.map((node) => node.position.x + node.display.width)) + 20
          const bottom = Math.max(...members.map((node) => node.position.y + node.display.height)) + 20
          return <section key={groupId} className="result-group-frame" aria-label={`${group.name} · 只读结果组`} style={{ left, top, width: right - left, height: bottom - top }}><strong>{group.name}</strong><ProcessingResultStatus branches={members.map((node) => ({ id: node.id, name: node.name, status: node.taskId ? snapshot.tasksById[node.taskId]?.status ?? 'queued' : 'queued' }))} /></section>
        })}</ViewportPortal>
      </ReactFlow>
      {snapshot.nodeOrder.length === 0 && <div className="canvas-empty-state">
        <p>双击画布添加新卡片</p>
        <span>选择文本、图片、视频或音频</span>
      </div>}
      <div className="canvas-history-controls" role="toolbar" aria-label="画布撤销控制">
        <button type="button" aria-label="撤销" title="撤销（Ctrl/Cmd+Z）" aria-keyshortcuts="Control+Z Meta+Z"
          disabled={!canUndo || !!deleteRequest || !!createMenu} onClick={() => restoreHistory(false)}>↶</button>
        <button type="button" aria-label="重做" title="重做（Ctrl/Cmd+Shift+Z）" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y"
          disabled={!canRedo || !!deleteRequest || !!createMenu} onClick={() => restoreHistory(true)}>↷</button>
      </div>
      <span className="canvas-announcement" role="status" aria-label="节点创建结果" aria-live="polite" aria-atomic="true">
        {creationResult.count > 0 ? `已创建${creationResult.name}（第 ${creationResult.count} 次创建）` : ''}
      </span>
      <NodeCreateMenu onCreate={createNode} />
      <span className={connectionFeedback ? 'connection-feedback' : 'canvas-announcement'} role="status" aria-label="连接提示" aria-live="polite" aria-atomic="true"
        style={connectionFeedback ? { position: 'fixed', left: Math.max(8, Math.min(connectionFeedback.anchor.x, window.innerWidth - 288)),
          top: Math.max(8, Math.min(connectionFeedback.anchor.y, window.innerHeight - 88)) } : undefined}>
        {connectionFeedback && <>{connectionFeedback.reason}<span className="canvas-announcement">（第 {connectionFeedback.count} 次连接提示）</span></>}
      </span>
      <span className="canvas-announcement" role="status" aria-label="画布操作结果" aria-live="polite" aria-atomic="true">
        {announcement.count > 0 ? `${announcement.message}（第 ${announcement.count} 次操作）` : ''}
      </span>
      {deleteRequest && <DeleteSelectionDialog eligibleCount={eligibleNodes.length} lockedCount={lockedCount} incidentEdgeCount={incidentEdgeCount}
        trigger={deleteRequest.trigger} fallbackTrigger={deletionFallback} onCancel={() => setDeleteRequest(null)} onConfirm={confirmDeletion} />}
      <ActiveMediaEditor />
    </section>
  )
}
