export type CanvasTheme = 'original' | 'shulan'

const standalonePages = new Set(['agent', 'assets', 'video', 'remake', 'skills', 'history'])

export function parseAppRoute(hash: string): { pageId: string; canvasTheme: CanvasTheme | null } {
  const path = hash.replace(/^#\/?/, '')
  if (path === 'canvas') return { pageId: 'canvas', canvasTheme: null }
  if (path === 'canvas/original') return { pageId: 'canvas', canvasTheme: 'original' }
  if (path === 'canvas/shulan') return { pageId: 'canvas', canvasTheme: 'shulan' }
  if (standalonePages.has(path)) return { pageId: path, canvasTheme: null }
  return { pageId: 'remake', canvasTheme: null }
}

export function canvasThemeHash(theme: CanvasTheme): string {
  return `#/canvas/${theme}`
}
