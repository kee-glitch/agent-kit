import { useEffect, useState } from 'react'
import { formatMentionToken, parseMentionTokens } from '../../domain/canvas/mentions'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { MentionPicker } from './MentionPicker'
import { promptPresets } from './promptPresets'
import { TextContentEditor } from './TextContentEditor'

export function PromptComposer({ nodeId, showBody = true, placeholder = '' }: { nodeId: string; showBody?: boolean; placeholder?: string }) {
  const input = useCanvasSessionStore((state) => state.snapshot.nodesById[nodeId]?.input)
  const [draft, setDraft] = useState(input?.prompt ?? '')
  const [mentionOpen, setMentionOpen] = useState(false)
  useEffect(() => setDraft(input?.prompt ?? ''), [input?.prompt])

  function commit(prompt = draft) {
    useCanvasSessionStore.getState().executeCommand({
      type: 'update-node-prompt', nodeId, prompt, mentionNodeIds: parseMentionTokens(prompt), now: new Date().toISOString(),
    })
  }

  return (
    <div className="prompt-composer">
      {showBody && <TextContentEditor nodeId={nodeId} />}
      <section aria-label="AI 指令编辑">
        <label><span className="prompt-composer__label">AI 指令</span>
          <textarea className="content-editor__textarea nodrag nopan" aria-label="AI 指令" value={draft}
            placeholder={placeholder}
            onChange={(event) => { setDraft(event.target.value); setMentionOpen(event.target.value.endsWith('@')) }}
            onBlur={() => commit()} />
        </label>
        {mentionOpen && <MentionPicker nodeId={nodeId} onChoose={(node) => {
          const prompt = `${draft.slice(0, -1)}${formatMentionToken(node)}`
          setDraft(prompt)
          setMentionOpen(false)
          commit(prompt)
          useCanvasSessionStore.getState().executeCommand({ type: 'add-reference', targetNodeId: nodeId,
            sourceNodeId: node.id, edgeId: crypto.randomUUID(), mention: true, now: new Date().toISOString() })
        }} />}
        <div className="prompt-presets" aria-label="常用提示词">
          {promptPresets.map((preset) => <button key={preset.id} type="button" aria-label={`使用提示词：${preset.name}`}
            onClick={() => { const prompt = [draft.trim(), preset.text].filter(Boolean).join('\n'); setDraft(prompt); commit(prompt) }}>{preset.name}</button>)}
        </div>
        {(input?.referenceNodeIds ?? []).map((id) => {
          const node = useCanvasSessionStore.getState().snapshot.nodesById[id]
          return <button key={id} type="button" className="reference-chip" onClick={() => {
            const deleteEdge = window.confirm('同时删除参考连线？')
            useCanvasSessionStore.getState().executeCommand({ type: 'remove-reference', targetNodeId: nodeId,
              sourceNodeId: id, deleteEdge, now: new Date().toISOString() })
          }}>{node ? `@${node.name} ×` : '来源已失效 ×'}</button>
        })}
      </section>
    </div>
  )
}
