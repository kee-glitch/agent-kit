type Sized = { id: string; display: { width: number; height: number } }
type Source = { position: { x: number; y: number }; display: { width: number; height: number } }
type Rect = { x: number; y: number; width: number; height: number }

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

export function layoutOperationResults(source: Source, results: Sized[], occupied: Rect[]): Record<string, { x: number; y: number }> {
  if (results.length === 0) return {}
  const columns = results.length >= 3 ? 2 : 1
  const columnWidth = Math.max(...results.map((result) => result.display.width)) + 40
  const rowHeight = Math.max(...results.map((result) => result.display.height)) + 80
  let baseX = source.position.x + source.display.width + 120
  const baseY = source.position.y
  while (results.some((result, index) => occupied.some((rect) => intersects({ x: baseX + (index % columns) * columnWidth, y: baseY + Math.floor(index / columns) * rowHeight, width: result.display.width, height: result.display.height }, rect)))) baseX += columnWidth
  return Object.fromEntries(results.map((result, index) => [result.id, { x: baseX + (index % columns) * columnWidth, y: baseY + Math.floor(index / columns) * rowHeight }]))
}
