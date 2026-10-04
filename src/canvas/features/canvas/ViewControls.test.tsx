import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ReactFlowProvider, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../persistence/canvasSnapshot'
import { CanvasSurface } from './CanvasSurface'
import { ViewControls } from './ViewControls'

const now = '2026-10-04T00:00:00.000Z'

function MeasureNodes() {
  const update = useUpdateNodeInternals()
  useEffect(() => {
    const frame = requestAnimationFrame(() => update(['node-0061', 'node-0062']))
    return () => cancelAnimationFrame(frame)
  }, [update])
  return null
}

function seed(content = false, measure = false) {
  const snapshot = createEmptySnapshot('view', now)
  snapshot.viewport = { x: 120, y: -70, zoom: 0.75 }
  if (content) {
    for (const [id, x] of [['a', 100], ['b', 500]] as const) {
      snapshot.nodeOrder.push(id)
      snapshot.nodesById[id] = { id, type: 'text', name: id, role: 'blank', position: { x, y: 100 },
        display: { width: 280, height: 180 }, locked: false, versionIds: [], currentVersionId: null,
        taskId: null, createdAt: now, updatedAt: now }
    }
  }
  saveCanvasSnapshot(localStorage, snapshot)
  hydrateCanvasSession(localStorage, now)
  render(<ReactFlowProvider><CanvasSurface /><ViewControls />{measure && <MeasureNodes />}</ReactFlowProvider>)
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set(), announcement: { count: 0, message: '' } })
})
afterEach(() => vi.unstubAllGlobals())

describe('ViewControls', () => {
  it('keeps_the_required_view_control_order_with_enabled_actions', () => {
    seed()
    const toolbar = screen.getByRole('toolbar', { name: '视图控制' })
    expect([...toolbar.querySelectorAll('button, output')].map((item) => item.getAttribute('aria-label')))
      .toEqual(['小地图', '自动整理卡片', '缩小', '当前缩放比例', '放大', '重置'])
    expect(within(toolbar).getByRole('button', { name: '小地图' })).toBeEnabled()
    expect(within(toolbar).getByRole('button', { name: '自动整理卡片' })).toBeEnabled()
  })

  it('toggles_minimap_without_snapshot_history_or_persistence_changes', () => {
    seed(true)
    const before = useCanvasSessionStore.getState().snapshot
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const toggle = screen.getByRole('button', { name: '小地图' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('img', { name: '小地图：节点类型与当前视口' })).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(screen.queryByRole('img', { name: '小地图：节点类型与当前视口' })).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    expect(writes).not.toHaveBeenCalled()
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(stored)
  })

  it('executes_one_layout_and_announces_only_an_accepted_change', () => {
    seed(true)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const commands = vi.spyOn(useCanvasSessionStore.getState(), 'executeCommand')
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    expect(commands).toHaveBeenCalledTimes(1)
    expect(commands).toHaveBeenCalledWith({ type: 'auto-layout', now: expect.any(String) })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 0, y: 0 })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.b.position).toEqual({ x: 0, y: 260 })
    expect(writes).toHaveBeenCalledTimes(1)
    const result = screen.getByRole('status', { name: '画布操作结果' })
    expect(result).toHaveTextContent('已自动整理卡片')
    const text = result.textContent
    const arranged = useCanvasSessionStore.getState().snapshot
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    expect(useCanvasSessionStore.getState().snapshot).toBe(arranged)
    expect(writes).toHaveBeenCalledTimes(1)
    expect(result.textContent).toBe(text)
    act(() => { useCanvasSessionStore.getState().undo() })
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 100, y: 100 })
  })

  it('resets_empty_canvas_and_announces_completion_without_a_history_entry', async () => {
    seed()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('100%'))
    await waitFor(() => expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已重置空画布视图'))
    expect(useCanvasSessionStore.getState().snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(writes).toHaveBeenCalledTimes(1)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    const result = useCanvasInteractionStore.getState().announcement
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)) })
    expect(useCanvasInteractionStore.getState().announcement).toBe(result)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('fits_content_with_reduced_motion_%s_and_persists_only_completion', async (reducedMotion) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })))
    vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1 })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('react-flow__node') ? 280 : 1280
    })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('react-flow__node') ? 180 : 800
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    seed(true, true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const positions = useCanvasSessionStore.getState().snapshot.nodesById
    const before = useCanvasSessionStore.getState().snapshot
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    if (reducedMotion) expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已适配画布内容')
    else {
      expect(writes).not.toHaveBeenCalled()
      expect(useCanvasSessionStore.getState().snapshot).toBe(before)
      expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(stored)
    }
    await waitFor(() => expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已适配画布内容'))
    const viewport = useCanvasSessionStore.getState().snapshot.viewport
    expect(viewport).not.toEqual({ x: 0, y: 0, zoom: 1 })
    expect(viewport.zoom).toBeGreaterThan(0)
    expect(useCanvasSessionStore.getState().snapshot.nodesById).toBe(positions)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport).toEqual(viewport)
    expect(writes).toHaveBeenCalledTimes(1)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    const result = useCanvasInteractionStore.getState().announcement
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 280)) })
    expect(useCanvasInteractionStore.getState().announcement).toBe(result)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('does_not_announce_or_save_layout_on_an_empty_canvas', () => {
    seed()
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    expect(screen.getByRole('status', { name: '画布操作结果' })).toBeEmptyDOMElement()
    expect(writes).not.toHaveBeenCalled()
  })

  it('honors_reduced_motion_and_finishes_empty_reset_without_animation_frames', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    seed()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('100%')
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已重置空画布视图')
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('updates_undo_redo_controls_immediately_and_announces_only_accepted_actions', () => {
    seed(true)
    const undo = screen.getByRole('button', { name: '撤销' })
    const redo = screen.getByRole('button', { name: '重做' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(undo)
    expect(screen.getByRole('status', { name: '画布操作结果' })).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
    fireEvent.click(undo)
    expect(undo).toBeDisabled()
    expect(redo).toBeEnabled()
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已撤销画布操作')
    fireEvent.click(redo)
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已重做画布操作')
    expect(writes).toHaveBeenCalledTimes(3)
    const result = useCanvasInteractionStore.getState().announcement
    fireEvent.click(redo)
    expect(useCanvasInteractionStore.getState().announcement).toBe(result)
    expect(writes).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('toolbar', { name: '画布撤销控制' }).closest('.canvas-surface')).toBeInTheDocument()
  })
})
