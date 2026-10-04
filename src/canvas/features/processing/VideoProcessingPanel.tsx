import { useState } from 'react'
import { getOperationDefinition } from '../../domain/canvas/mediaOperations'
import type { MediaOperation } from '../../domain/canvas/types'
import { startProcessing } from './startProcessing'

export function VideoProcessingPanel({ nodeId, operation }: { nodeId: string; operation: MediaOperation }) {
  const [error, setError] = useState<string | null>(null)
  const definition = getOperationDefinition(operation)
  return <section className="processing-panel" aria-label={`${definition.label}设置`}>
    {error && <p className="generation-field-error">{error}</p>}
    <button type="button" onClick={() => { const result = startProcessing(nodeId, operation); if (!result.ok) setError(result.error) }}>开始{definition.label}</button>
  </section>
}
