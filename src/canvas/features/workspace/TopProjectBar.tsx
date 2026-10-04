import { useId, useState } from 'react'
import { renameCanvas, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'

const saveLabels = {
  saved: '已保存到本地',
  saving: '正在保存到本地',
  failed: '本地保存未确认',
}

function CanvasNameInput({ name }: { name: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="canvas-name"
      aria-label="画布名称"
      value={draft ?? name}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        renameCanvas(draft ?? name)
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export function TopProjectBar() {
  const name = useCanvasSessionStore((state) => state.snapshot.canvas.name)
  const saveStatus = useCanvasSessionStore((state) => state.saveStatus)
  const shareDescriptionId = useId()
  const laterDescriptionId = useId()
  return (
    <section className="top-project-bar" aria-label="项目控制">
      <button type="button" aria-label="项目菜单" disabled aria-describedby={laterDescriptionId}>项目</button>
      <CanvasNameInput name={name} />
      <span role="status" aria-label="本地保存状态">{saveLabels[saveStatus]}</span>
      <button className="share-control" type="button" disabled aria-describedby={shareDescriptionId}>分享</button>
      <span id={shareDescriptionId} hidden>本地画布暂不支持分享</span>
      <span id={laterDescriptionId} hidden>后续阶段开放</span>
    </section>
  )
}
