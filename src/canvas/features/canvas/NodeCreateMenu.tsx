import type { ContentType } from '../../domain/canvas/types'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'

const choices: { type: ContentType; label: string }[] = [
  { type: 'text', label: '文本' }, { type: 'image', label: '图片' },
  { type: 'video', label: '视频' }, { type: 'audio', label: '音频' },
]
const symbols: Record<ContentType, string> = { text: '▤', image: '▧', video: '▣', audio: '◖' }

export function NodeCreateMenu({ onCreate }: { onCreate: (type: ContentType) => void }) {
  const menu = useCanvasInteractionStore((state) => state.createMenu)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ x: 8, y: 8 })

  function close() {
    useCanvasInteractionStore.getState().closeCreateMenu()
    menu?.trigger.focus({ preventScroll: true })
  }

  function choose(type: ContentType) {
    onCreate(type)
    close()
  }

  useLayoutEffect(() => {
    if (!menu) return
    function clamp() {
      if (!menu || !menuRef.current) return
      const { width, height } = menuRef.current.getBoundingClientRect()
      setPosition({
        x: Math.max(8, Math.min(menu.anchor.x, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(menu.anchor.y, window.innerHeight - height - 8)),
      })
    }
    clamp()
    setActive(0)
    itemsRef.current[0]?.focus()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [menu])

  useEffect(() => {
    if (!menu) return
    function outside(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        useCanvasInteractionStore.getState().closeCreateMenu()
        menu?.trigger.focus({ preventScroll: true })
      }
    }
    // Click follows native pointer focus; capture also precedes a trigger reopening the menu.
    document.addEventListener('click', outside, true)
    return () => document.removeEventListener('click', outside, true)
  }, [menu])

  useEffect(() => () => useCanvasInteractionStore.getState().closeCreateMenu(), [])

  if (!menu) return null
  return createPortal(
    <div
      ref={menuRef} className="node-create-menu" role="menu" aria-label="添加节点类型"
      style={{ left: position.x, top: position.y }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const next = (active + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length
          setActive(next)
          itemsRef.current[next]?.focus()
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          choose(choices[active].type)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
    >
      <span className="node-create-menu__heading">添加节点</span>
      {choices.map((choice, index) => (
        <button
          key={choice.type} ref={(element) => { itemsRef.current[index] = element }}
          type="button" role="menuitem" aria-label={choice.label} tabIndex={active === index ? 0 : -1}
          onFocus={() => setActive(index)} onClick={() => choose(choice.type)}
        ><span aria-hidden="true">{symbols[choice.type]}</span>{choice.label}</button>
      ))}
      <span className="node-create-menu__divider" aria-hidden="true" />
      <span className="node-create-menu__heading">添加资源</span>
      <button type="button" className="node-create-menu__resource" disabled><span aria-hidden="true">↥</span>从本地上传</button>
      <button type="button" className="node-create-menu__resource" disabled><span aria-hidden="true">▣</span>从资产库选择</button>
    </div>, document.body,
  )
}
