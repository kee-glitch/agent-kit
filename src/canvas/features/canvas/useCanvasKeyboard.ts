import { useEffect } from 'react'
import { isPersistableContent } from '../../domain/canvas/migrateSnapshot'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'

export function duplicateCanvasNodes(nodeIds: string[]): boolean {
  const { snapshot, executeCommand } = useCanvasSessionStore.getState()
  const sources = nodeIds.filter((id) => Object.hasOwn(snapshot.nodesById, id))
  if (sources.length === 0) return false
  const duplicates = sources.map((sourceNodeId) => ({
    sourceNodeId, nodeId: crypto.randomUUID(),
    versionIds: Object.fromEntries(snapshot.nodesById[sourceNodeId].versionIds.map((id) => [id, crypto.randomUUID()])),
  }))
  if (executeCommand({ type: 'duplicate-nodes', duplicates, now: new Date().toISOString() })) {
    const interaction = useCanvasInteractionStore.getState()
    interaction.replaceSelection(duplicates.map(({ nodeId }) => nodeId))
    interaction.announce(`已创建 ${duplicates.length} 个副本`)
    return true
  }
  return false
}

async function copySelectedNodes(nodeIds: string[]): Promise<void> {
  const { snapshot } = useCanvasSessionStore.getState()
  const nodes = snapshot.nodeOrder.filter((id) => nodeIds.includes(id)).map((id) => {
    const node = snapshot.nodesById[id]
    return {
      id: node.id, type: node.type, role: node.role, name: node.name,
      position: { x: node.position.x, y: node.position.y }, display: { width: node.display.width, height: node.display.height }, locked: node.locked,
      input: structuredClone(node.input),
      versionIds: [...node.versionIds], currentVersionId: node.currentVersionId,
      createdAt: node.createdAt, updatedAt: node.updatedAt,
      versions: node.versionIds.filter((versionId) => Object.hasOwn(snapshot.versionsById, versionId)).map((versionId) => {
        const version = snapshot.versionsById[versionId]
        return { id: version.id, nodeId: node.id, createdAt: version.createdAt,
          content: isPersistableContent(version.content, node) ? version.content : null }
      }),
    }
  })
  if (nodes.length === 0) return
  try {
    await navigator.clipboard.writeText(JSON.stringify({ schemaVersion: 3, nodes }))
    useCanvasInteractionStore.getState().announce(`已复制 ${nodes.length} 个节点到剪贴板`)
  } catch {
    useCanvasInteractionStore.getState().announce('无法写入剪贴板，请检查浏览器权限')
  }
}

export function useCanvasKeyboard({ onDeleteRequest, enabled }: { onDeleteRequest: (trigger: HTMLElement) => void; enabled: boolean }): void {
  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (event.defaultPrevented || !(target instanceof Element)
        || target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
        || event.altKey || (event.ctrlKey && event.metaKey)) return
      const modified = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const interaction = useCanvasInteractionStore.getState()
      const ids = [...interaction.selectedNodeIds]
      if (!modified && !event.shiftKey && (key === 'delete' || key === 'backspace')) {
        const { snapshot } = useCanvasSessionStore.getState()
        if (interaction.selectedEdgeIds.size > 0 || ids.some((id) => Object.hasOwn(snapshot.nodesById, id) && !snapshot.nodesById[id].locked)) {
          event.preventDefault()
          onDeleteRequest(target instanceof HTMLElement ? target : target.closest<HTMLElement>('.canvas-surface') ?? document.body)
        }
        return
      }
      if (!modified || (event.shiftKey && key !== 'z')) return
      if (key === 'c') {
        if (ids.length === 0) return
        event.preventDefault()
        void copySelectedNodes(ids)
      } else if (key === 'd') {
        event.preventDefault()
        const canvas = target.closest<HTMLElement>('.canvas-surface')
        if (duplicateCanvasNodes(ids)) canvas?.focus({ preventScroll: true })
      } else if (key === 'z' || key === 'y') {
        event.preventDefault()
        const session = useCanvasSessionStore.getState()
        const isRedo = key === 'y' || event.shiftKey
        const canvas = target.closest('.react-flow__node, .react-flow__edge') ? target.closest<HTMLElement>('.canvas-surface') : null
        if ((isRedo ? session.redo : session.undo)()) {
          const { snapshot } = useCanvasSessionStore.getState()
          if (interaction.selectedEdgeIds.size > 0) interaction.replaceEdgeSelection([...interaction.selectedEdgeIds].filter((id) => Object.hasOwn(snapshot.edgesById, id)))
          else interaction.replaceSelection(ids.filter((id) => Object.hasOwn(snapshot.nodesById, id)))
          interaction.announce(isRedo ? '已重做画布操作' : '已撤销画布操作')
          canvas?.focus({ preventScroll: true })
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, onDeleteRequest])
}
