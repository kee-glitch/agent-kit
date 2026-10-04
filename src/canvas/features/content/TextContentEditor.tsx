import { useEffect, useState } from 'react'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

export function TextContentEditor({ nodeId }: { nodeId: string }) {
  const body = useCanvasSessionStore((state) => state.snapshot.nodesById[nodeId]?.input?.body ?? '')
  const [draft, setDraft] = useState(body)
  useEffect(() => setDraft(body), [body])
  return (
    <section className="content-editor" aria-label="正文编辑">
      <label>正文内容
        <textarea className="content-editor__textarea nodrag nopan" aria-label="正文内容" value={draft}
          onChange={(event) => setDraft(event.target.value)} onBlur={() => useCanvasSessionStore.getState().executeCommand({
            type: 'update-node-body', nodeId, body: draft, now: new Date().toISOString(),
          })} />
      </label>
      <span className="canvas-node__detail">{draft.length} 字</span>
    </section>
  )
}
