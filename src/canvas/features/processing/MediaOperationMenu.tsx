import { useRef, useState } from 'react'
import type { ContentType, MediaOperation } from '../../domain/canvas/types'

const imageItems: [MediaOperation, string][] = [['image-analysis', '图片分析'], ['image-edit', '图片编辑'], ['image-privacy', '隐私保护']]
const videoItems: [MediaOperation, string][] = [['clip-remake', '片段重拍'], ['script-breakdown', '脚本拆解'], ['extract-frames', '视频抽帧'], ['storyboard', '分镜'], ['audio-video-split', '音视频分离'], ['video-privacy', '隐私保护']]
const processItems: [MediaOperation, string][] = [['quality-enhance', '画质增强'], ['subtitle-remove', '字幕擦除'], ['watermark-remove', '去水印'], ['voice-change', '换音色'], ['motion-extract', '动作提取']]

export function MediaOperationMenu({ type, onSelect }: { type: ContentType; onSelect(operation: MediaOperation): void }) {
  const [open, setOpen] = useState(false), [submenu, setSubmenu] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  if (type !== 'image' && type !== 'video') return null
  const choose = (operation: MediaOperation) => { onSelect(operation); setOpen(false); setSubmenu(false); queueMicrotask(() => trigger.current?.focus()) }
  return <div className="processing-menu" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); setSubmenu(false); trigger.current?.focus() } }}>
    <button ref={trigger} type="button" className="canvas-node__control" aria-expanded={open} onClick={() => setOpen((value) => !value)}>媒体处理</button>
    {open && <div role="menu" aria-label={`${type === 'image' ? '图片' : '视频'}处理`}>
      {(type === 'image' ? imageItems : videoItems).map(([operation, label]) => <button key={operation} type="button" role="menuitem" onClick={() => choose(operation)}>{label}</button>)}
      {type === 'video' && <button type="button" role="menuitem" aria-expanded={submenu} onClick={() => setSubmenu((value) => !value)}>视频处理</button>}
      {submenu && <div role="menu" aria-label="视频处理工具">{processItems.map(([operation, label]) => <button key={operation} type="button" role="menuitem" onClick={() => choose(operation)}>{label}</button>)}</div>}
    </div>}
  </div>
}
