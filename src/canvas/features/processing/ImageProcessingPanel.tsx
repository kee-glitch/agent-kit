import { useState } from 'react'
import { getOperationDefinition, validateMediaOperation } from '../../domain/canvas/mediaOperations'
import type { MediaOperation } from '../../domain/canvas/types'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { startProcessing } from './startProcessing'

export function ImageProcessingPanel({ nodeId, initialOperation }: { nodeId: string; initialOperation: Extract<MediaOperation, `image-${string}`> }) {
  const [prompt, setPrompt] = useState(''), [error, setError] = useState<string | null>(null)
  const snapshot = useCanvasSessionStore((state) => state.snapshot)
  const definition = getOperationDefinition(initialOperation)
  const request = { kind: 'media-operation' as const, operation: initialOperation, sourceNodeId: nodeId, outputType: definition.outputTypes[0], prompt,
    range: null, crop: null, clipNodeIds: [], voiceTargetNodeId: null }
  const validation = validateMediaOperation(snapshot, request)
  return <section className="processing-panel" aria-label={`${definition.label}设置`}>
    {initialOperation === 'image-edit' && <label>处理指令<textarea aria-label="处理指令" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>}
    {!validation.ok && <p className="generation-field-error">{validation.error}</p>}
    {error && <p className="generation-field-error">{error}</p>}
    <button type="button" disabled={!validation.ok} onClick={() => { const result = startProcessing(nodeId, initialOperation, prompt); if (!result.ok) setError(result.error) }}>开始{definition.label}</button>
  </section>
}
