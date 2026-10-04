const standalonePages = new Set(['agent', 'assets', 'video', 'remake', 'skills', 'history'])

export function parseAppRoute(hash: string): { pageId: string } {
  const path = hash.replace(/^#\/?/, '')
  if (path === 'canvas' || path === 'canvas/original') return { pageId: 'canvas' }
  if (standalonePages.has(path)) return { pageId: path }
  return { pageId: 'remake' }
}
