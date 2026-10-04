export function DiscardEditorDraftDialog({ onSave, onDiscard, onCancel }: { onSave(): void; onDiscard(): void; onCancel(): void }) {
  return <div className="editor-dialog-backdrop"><section role="dialog" aria-modal="true" aria-label="放弃编辑草稿" onKeyDown={(event) => { if (event.key === 'Escape') onCancel() }}>
    <h2>保存编辑草稿？</h2><p>当前编辑尚未保存，可以保存草稿后退出或直接放弃。</p>
    <div><button type="button" onClick={onCancel}>继续编辑</button><button type="button" onClick={onDiscard}>放弃草稿</button><button type="button" onClick={onSave}>保存并退出</button></div>
  </section></div>
}
