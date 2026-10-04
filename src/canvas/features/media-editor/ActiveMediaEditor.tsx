import { useEffect, useMemo, useState } from 'react'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { CropEditor } from './CropEditor'
import { MediaEditorWorkspace } from './MediaEditorWorkspace'
import { SpliceEditor } from './SpliceEditor'
import { applyEditorEdit, createEditorDraft, redoEditorEdit, undoEditorEdit } from './mediaEditorModel'
import { exportMediaEditorDraft } from './exportMediaEditorDraft'

export function ActiveMediaEditor() {
  const request = useCanvasInteractionStore((state) => state.editorRequest)
  const snapshot = useCanvasSessionStore((state) => state.snapshot)
  const persisted = request ? snapshot.editorDraftsBySourceId[request.sourceNodeId] : null
  const initial = useMemo(() => {
    if (!request) return null
    const source = snapshot.nodesById[request.sourceNodeId]
    if (!source) return null
    const duration = source.input?.media?.durationSeconds ?? 10
    const clips = request.mode === 'splice' ? snapshot.nodeOrder.filter((id) => snapshot.nodesById[id].type === 'video').slice(0, 2) : []
    return persisted ?? createEditorDraft(request.mode, { id: request.sourceNodeId, durationSeconds: duration }, clips)
  }, [request, persisted, snapshot])
  const [draft, setDraft] = useState(initial)
  useEffect(() => { setDraft(initial) }, [request?.sourceNodeId, request?.mode])
  if (!request || !draft || !snapshot.nodesById[request.sourceNodeId]) return null
  const save = (next: typeof draft) => useCanvasSessionStore.getState().executeCommand({ type: 'update-editor-draft', draft: next, now: new Date().toISOString() })
  const names = Object.fromEntries(snapshot.nodeOrder.map((id) => [id, snapshot.nodesById[id].name]))
  return <MediaEditorWorkspace draft={draft} onChange={setDraft} onSave={save} onClose={() => useCanvasInteractionStore.getState().closeEditor()}
    onModeChange={(mode) => useCanvasInteractionStore.getState().openEditor(request.sourceNodeId, mode)}
    onUndo={() => setDraft(undoEditorEdit(draft))} onRedo={() => setDraft(redoEditorEdit(draft))}>
    {draft.mode === 'crop' && <CropEditor draft={draft} onChange={setDraft} />}
    {draft.mode === 'splice' && <SpliceEditor draft={draft} names={names} onChange={(ids) => setDraft(applyEditorEdit(draft, { clipNodeIds: ids }))} />}
    <div className="media-editor__actions"><button type="button" disabled={draft.mode === 'splice' && draft.clipNodeIds.length < 2} onClick={() => exportMediaEditorDraft(request.sourceNodeId, draft, 'success')}>导出新视频</button></div>
  </MediaEditorWorkspace>
}
