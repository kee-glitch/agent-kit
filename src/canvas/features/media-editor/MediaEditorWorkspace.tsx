import { useState } from 'react'
import type { EditorMode, MediaEditorDraft } from '../../domain/canvas/types'
import { TimelineRangeEditor } from './TimelineRangeEditor'
import { DiscardEditorDraftDialog } from './DiscardEditorDraftDialog'
import { applyEditorEdit } from './mediaEditorModel'
import './media-editor.css'

const labels = { clip: '剪辑', crop: '裁剪', splice: '拼接', segment: '片段选择' }
export function MediaEditorWorkspace({ draft, onChange, onSave, onClose, onModeChange, onUndo, onRedo, children }: { draft: MediaEditorDraft; onChange(draft: MediaEditorDraft): void; onSave(draft: MediaEditorDraft): void; onClose(): void; onModeChange?(mode: EditorMode): void; onUndo?(): void; onRedo?(): void; children?: React.ReactNode }) {
  const [confirmClose, setConfirmClose] = useState(false)
  const close = () => draft.dirty ? setConfirmClose(true) : onClose()
  return <section className="media-editor" role="region" aria-label={`${labels[draft.mode]}编辑器`} data-placement="bottom" onKeyDown={(event) => event.stopPropagation()}>
    <header><strong>{labels[draft.mode]}工作区</strong><nav aria-label="编辑模式">{(Object.entries(labels) as [EditorMode, string][]).map(([mode, label]) => <button key={mode} type="button" aria-label={`切换到${label}`} aria-pressed={draft.mode === mode} onClick={() => onModeChange?.(mode)}>{label}</button>)}</nav><button type="button" aria-label="关闭编辑器" onClick={close}>×</button></header>
    <div className="media-editor__preview"><video aria-label="视频预览" muted controls /><span>00:00 / {draft.durationSeconds.toFixed(1)}s</span></div>
    <TimelineRangeEditor duration={draft.durationSeconds} inPoint={draft.inPoint} outPoint={draft.outPoint} onChange={(range) => onChange(applyEditorEdit(draft, range))} />
    {children}
    <footer><button type="button" aria-label="撤销编辑" disabled={!draft.undoStack.length} onClick={onUndo}>撤销</button><button type="button" aria-label="重做编辑" disabled={!draft.redoStack.length} onClick={onRedo}>重做</button><button type="button" onClick={() => onSave(draft)}>保存草稿</button></footer>
    {confirmClose && <DiscardEditorDraftDialog onCancel={() => setConfirmClose(false)} onDiscard={onClose} onSave={() => { onSave(draft); onClose() }} />}
  </section>
}
