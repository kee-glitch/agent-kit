import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface DeleteSelectionDialogProps {
  eligibleCount: number
  lockedCount: number
  incidentEdgeCount: number
  trigger: HTMLElement
  fallbackTrigger?: HTMLElement | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSelectionDialog({ eligibleCount, lockedCount, incidentEdgeCount, trigger, fallbackTrigger, onCancel, onConfirm }: DeleteSelectionDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmed = useRef(false)
  useEffect(() => {
    cancelRef.current?.focus()
    function retainFocus(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) cancelRef.current?.focus()
    }
    document.addEventListener('focusin', retainFocus)
    return () => {
      document.removeEventListener('focusin', retainFocus)
      // React Flow removes deleted nodes after this cleanup; confirm uses the stable canvas.
      const restoreTarget = confirmed.current && fallbackTrigger ? fallbackTrigger : trigger.isConnected ? trigger : fallbackTrigger
      restoreTarget?.focus({ preventScroll: true })
    }
  }, [trigger, fallbackTrigger])

  return createPortal(
    <div className="delete-selection-backdrop">
      <section ref={dialogRef} className="delete-selection-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel() }
          if (event.key === 'Tab') {
            const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            if (!buttons?.length) return
            const first = buttons[0]
            const last = buttons[buttons.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
          }
        }}>
        <h2 id={titleId}>删除所选节点</h2>
        <div id={descriptionId}>
          <p>删除 {eligibleCount} 个节点及 {incidentEdgeCount} 条关联关系？</p>
          {lockedCount > 0 && <p>{lockedCount} 个锁定节点将保留。</p>}
        </div>
        <div className="delete-selection-dialog__actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>取消</button>
          <button type="button" disabled={eligibleCount === 0} onClick={() => { confirmed.current = true; onConfirm() }}>确认删除</button>
        </div>
      </section>
    </div>, document.body,
  )
}
