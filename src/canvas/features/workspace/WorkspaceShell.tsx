import type { ReactNode } from 'react'
import { useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { CreateToolRail } from './CreateToolRail'
import { TopProjectBar } from './TopProjectBar'

interface WorkspaceShellProps {
  children?: ReactNode
  viewControls?: ReactNode
}

export function WorkspaceShell({ children, viewControls }: WorkspaceShellProps) {
  const recoveryNotice = useCanvasSessionStore((state) => state.recoveryNotice)
  return (
    <main className="workspace-shell" aria-label="无限画布工作台">
      <div className="workspace-top-region">
        <TopProjectBar />
        {recoveryNotice && <div className="recovery-banner" role="alert">{recoveryNotice}</div>}
      </div>
      <div className="workspace-canvas-slot">{children}</div>
      <div className="workspace-view-controls">{viewControls}</div>
      <CreateToolRail />
    </main>
  )
}
