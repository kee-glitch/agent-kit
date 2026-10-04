import { useMemo, useState } from 'react'
import type { CanvasNodeEntity } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

const typeLabel = { text: '文本', image: '图片', video: '视频', audio: '音频' }

export function MentionPicker({ nodeId, onChoose }: { nodeId: string; onChoose(node: CanvasNodeEntity): void }) {
  const [query, setQuery] = useState('')
  const snapshot = useCanvasSessionStore((state) => state.snapshot)
  const nodes = useMemo(() => snapshot.nodeOrder.map((id) => snapshot.nodesById[id])
    .filter((node) => node.id !== nodeId && (!query || node.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))), [snapshot, nodeId, query])
  return (
    <div className="mention-picker">
      <input aria-label="搜索引用节点" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
      <div role="listbox" aria-label="引用节点">
        {nodes.map((node) => <button key={node.id} type="button" role="option" aria-selected="false"
          onMouseDown={(event) => event.preventDefault()} onClick={() => onChoose(node)}>{node.name} · {typeLabel[node.type]}</button>)}
      </div>
    </div>
  )
}
