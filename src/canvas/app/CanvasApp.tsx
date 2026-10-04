import { useEffect, useRef, useState, type JSX } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { CanvasSurface } from '../features/canvas/CanvasSurface'
import { ViewControls } from '../features/canvas/ViewControls'
import { WorkspaceShell } from '../features/workspace/WorkspaceShell'
import { hydrateCanvasSession } from '../stores/useCanvasSessionStore'

export function CanvasApp(): JSX.Element {
  const hydrated = useRef(false)
  const [sessionReady, setSessionReady] = useState(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    try {
      const storage = localStorage
      hydrateCanvasSession(storage, new Date().toISOString())
    } catch {
      hydrateCanvasSession(null, new Date().toISOString())
    }
    setSessionReady(true)
  }, [])

  return (
    <div className="canvas-module" data-canvas-theme="original" data-testid="canvas-theme-root">
      <ReactFlowProvider>
        <WorkspaceShell viewControls={sessionReady ? <ViewControls /> : undefined}>
          {sessionReady && <CanvasSurface />}
        </WorkspaceShell>
      </ReactFlowProvider>
    </div>
  )
}
