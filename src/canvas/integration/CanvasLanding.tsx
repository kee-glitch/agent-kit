import { LayoutTemplate, Palette } from 'lucide-react'
import { canvasThemeHash } from './canvasRoute'

const entries = [
  {
    theme: 'original' as const,
    title: '保留当前外观',
    description: '完整保留无限画布现有界面与交互习惯。',
    Icon: LayoutTemplate,
  },
  {
    theme: 'shulan' as const,
    title: 'ShuLan 设计语言',
    description: '使用 ShuLan 的字体、色彩、圆角与界面层级。',
    Icon: Palette,
  },
]

export function CanvasLanding() {
  return (
    <main className="canvas-landing page-content">
      <header className="page-header">
        <div><h1>画布</h1><p>同一套完整功能与数据，选择你想预览的界面风格。</p></div>
      </header>
      <section className="canvas-entry-grid" aria-label="画布外观">
        {entries.map(({ theme, title, description, Icon }) => (
          <a className="canvas-entry-card" href={canvasThemeHash(theme)} key={theme}>
            <span><Icon aria-hidden="true" /></span>
            <div><h2>{title}</h2><p>{description}</p></div>
            <strong>进入画布</strong>
          </a>
        ))}
      </section>
    </main>
  )
}
