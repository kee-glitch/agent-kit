import type { ContentType } from '../../domain/canvas/types'

export function MediaPreview({ type, src, name }: { type: Exclude<ContentType, 'text'>; src: string; name: string }) {
  if (type === 'image') return <img className="canvas-node__media" src={src} alt={name} />
  if (type === 'video') return <video className="canvas-node__media" src={src} aria-label={name} controls muted preload="metadata" />
  return <audio className="canvas-node__audio" src={src} aria-label={name} controls preload="metadata" />
}
