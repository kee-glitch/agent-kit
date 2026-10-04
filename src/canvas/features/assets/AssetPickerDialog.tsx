import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDefaultNodeDisplay, createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import type { AssetLibraryItem } from '../../services/contracts/canvasServices'
import { createMockCanvasServices } from '../../services/mock/createMockCanvasServices'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useLocalMediaStore } from '../../stores/useLocalMediaStore'

export type AssetPickerPurpose = 'create-node' | 'replace-media' | 'add-reference' | 'select-voice-target'
const typeLabel = { text: '文本', image: '图片', video: '视频', audio: '音频' }

export function AssetPickerDialog({ purpose, nodeId, onClose }: { purpose: AssetPickerPurpose; nodeId?: string; onClose(): void }) {
  const [assets, setAssets] = useState<AssetLibraryItem[]>([])
  const [selected, setSelected] = useState<AssetLibraryItem | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const targetType = useCanvasSessionStore((state) => nodeId ? state.snapshot.nodesById[nodeId]?.type : undefined)
  useEffect(() => {
    void createMockCanvasServices().assets.listAssets().then(setAssets)
    cancelRef.current?.focus()
    function retainFocus(event: FocusEvent) { if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) cancelRef.current?.focus() }
    document.addEventListener('focusin', retainFocus)
    return () => document.removeEventListener('focusin', retainFocus)
  }, [])
  const visible = assets.filter((asset) => purpose === 'replace-media' ? asset.type === targetType
    : purpose === 'select-voice-target' ? asset.type === 'audio' : asset.type !== 'text')

  function apply(item: AssetLibraryItem) {
    const store = useCanvasSessionStore.getState()
    const now = new Date().toISOString()
    if (purpose === 'replace-media' && nodeId) {
      useLocalMediaStore.getState().remove(nodeId)
      store.executeCommand({ type: 'set-node-media', nodeId, now, media: {
        source: 'asset', name: item.name, mimeType: `${item.type}/fixture`, assetId: item.id,
        durationSeconds: null, requiresReselect: false,
      } })
      return
    }
    const assetNodeId = crypto.randomUUID()
    const target = nodeId ? store.snapshot.nodesById[nodeId] : undefined
    store.executeCommand({ type: 'create-node', node: {
      id: assetNodeId, type: item.type, role: 'imported', name: item.name,
      position: target ? { x: target.position.x - 380, y: target.position.y } : { x: 0, y: 0 },
      locked: false, display: getDefaultNodeDisplay(item.type), input: { ...createEmptyNodeInput(), media: {
        source: 'asset', name: item.name, mimeType: `${item.type}/fixture`, assetId: item.id,
        durationSeconds: null, requiresReselect: false,
      } }, versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
    } })
    if (purpose === 'add-reference' && nodeId) store.executeCommand({ type: 'add-reference', targetNodeId: nodeId,
      sourceNodeId: assetNodeId, edgeId: crypto.randomUUID(), mention: false, now })
    if (purpose === 'select-voice-target' && nodeId) store.executeCommand({ type: 'set-voice-target', nodeId, sourceNodeId: assetNodeId, now })
  }

  return (
    <div className="asset-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="asset-picker-dialog" role="dialog" aria-modal="true" aria-label="选择模拟资产"
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
          if (event.key !== 'Tab') return
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
          if (!controls?.length) return
          const first = controls[0], last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}>
        <header><strong>选择资产</strong><span>{purpose === 'replace-media' ? '替换媒体' : purpose === 'add-reference' ? '添加参考' : purpose === 'select-voice-target' ? '目标音色' : '新建节点'}</span></header>
        <div role="listbox" aria-label="模拟资产">
          {visible.map((asset) => <button key={asset.id} type="button" role="option" aria-selected={selected?.id === asset.id}
            onClick={() => setSelected(asset)}>{asset.name} · {typeLabel[asset.type]}</button>)}
        </div>
        <footer><button ref={cancelRef} type="button" onClick={onClose}>取消</button>
          <button type="button" disabled={!selected} onClick={() => { if (selected) apply(selected); onClose() }}>确认选择</button></footer>
      </section>
    </div>
  )
}

export function AssetPickerButton({ purpose, nodeId, label }: { purpose: AssetPickerPurpose; nodeId?: string; label: string }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return <><button ref={trigger} type="button" className={`canvas-node__control nodrag nopan${purpose === 'replace-media' ? ' canvas-node__asset-trigger' : ''}`} onClick={() => setOpen(true)}>{label}</button>
    {open && createPortal(<AssetPickerDialog purpose={purpose} nodeId={nodeId} onClose={() => { setOpen(false); queueMicrotask(() => trigger.current?.focus()) }} />, document.body)}</>
}
