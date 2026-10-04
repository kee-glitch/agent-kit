import { useId, useState } from 'react'
import type { ContentType } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useLocalMediaStore } from '../../stores/useLocalMediaStore'
import { MediaPreview } from './MediaPreview'

const labels = { image: '图片', video: '视频', audio: '音频' }
const accepts = { image: 'image/*', video: 'video/*', audio: 'audio/*' }

export function LocalMediaPicker({ nodeId, type }: { nodeId: string; type: Exclude<ContentType, 'text'> }) {
  const inputId = useId()
  const [error, setError] = useState('')
  const entry = useLocalMediaStore((state) => Object.hasOwn(state.entries, nodeId) ? state.entries[nodeId] : undefined)
  const metadata = useCanvasSessionStore((state) => state.snapshot.nodesById[nodeId]?.input?.media)
  const generated = useCanvasSessionStore((state) => {
    const node = state.snapshot.nodesById[nodeId]
    return node?.currentVersionId ? state.snapshot.versionsById[node.currentVersionId]?.content : null
  })
  const activeLocal = metadata?.source === 'local' && entry?.file.name === metadata.name ? entry : undefined
  const assetUrl = metadata?.source === 'asset' && metadata.assetId
    ? ({ 'asset-image-product': '/fixtures/asset-image.svg', 'asset-video-city': '/fixtures/generated-video.mp4', 'asset-audio-voice': '/fixtures/sample-audio.wav' } as Record<string, string>)[metadata.assetId]
    : undefined
  const missing = metadata?.source === 'local' && !activeLocal
  const preview = activeLocal ? { src: activeLocal.objectUrl, name: activeLocal.file.name }
    : assetUrl ? { src: assetUrl, name: metadata?.name ?? '模拟资产' }
      : generated ? { src: generated, name: `生成${labels[type]}预览` } : null
  return (
    <div className="local-media-picker nodrag nopan">
      {preview ? <MediaPreview type={type} src={preview.src} name={preview.name} /> : missing
        ? <p className="canvas-node__media-missing" role="status">需要重新选择本地文件</p> : null}
      <label className="canvas-node__control" htmlFor={inputId}>{preview || missing ? `重新选择${labels[type]}` : `本地选择${labels[type]}`}</label>
      <input id={inputId} className="canvas-node__file-input" type="file" accept={accepts[type]} aria-label={`选择本地${labels[type]}`}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (!file) return
          if (!file.type.startsWith(`${type}/`)) { setError(`请选择${labels[type]}文件`); return }
          setError('')
          useLocalMediaStore.getState().attach(nodeId, file)
          useCanvasSessionStore.getState().executeCommand({ type: 'set-node-media', nodeId, now: new Date().toISOString(), media: {
            source: 'local', name: file.name, mimeType: file.type, assetId: null, durationSeconds: null, requiresReselect: true,
          } })
        }} />
      {error && <p className="canvas-node__field-error" role="alert">{error}</p>}
    </div>
  )
}
