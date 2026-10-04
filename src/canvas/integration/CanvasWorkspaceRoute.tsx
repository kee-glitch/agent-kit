import { ArrowLeft } from 'lucide-react'
import { CanvasApp } from '../app/CanvasApp'
import type { CanvasTheme } from './canvasRoute'

export function CanvasWorkspaceRoute({
  theme,
  onThemeChange,
}: {
  theme: CanvasTheme
  onThemeChange: (theme: CanvasTheme) => void
}) {
  return (
    <div className="canvas-workspace-route">
      <header className="canvas-theme-bar">
        <a href="#/canvas" aria-label="返回画布入口"><ArrowLeft aria-hidden="true" />画布</a>
        <div className="canvas-theme-switch" aria-label="画布外观">
          <button aria-pressed={theme === 'original'} className={theme === 'original' ? 'active' : ''} type="button" onClick={() => onThemeChange('original')}>原始外观</button>
          <button aria-pressed={theme === 'shulan'} className={theme === 'shulan' ? 'active' : ''} type="button" onClick={() => onThemeChange('shulan')}>ShuLan 设计</button>
        </div>
      </header>
      <CanvasApp theme={theme} />
    </div>
  )
}
