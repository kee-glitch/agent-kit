import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasApp } from '../../app/CanvasApp'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import globalCss from '../../styles/canvas-base.css?raw'
import { CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../persistence/canvasSnapshot'
import { WorkspaceShell } from '../workspace/WorkspaceShell'
import { CanvasSurface } from './CanvasSurface'
import { ViewControls } from './ViewControls'
import { toFlowNodeId } from './canvasAdapters'

const now = '2026-10-04T00:00:00.000Z'

function seedManipulationNodes() {
  const snapshot = createEmptySnapshot('selection', now)
  for (const [id, x, locked] of [['a', 100, false], ['b', 500, false], ['locked', 900, true]] as const) {
    snapshot.nodesById[id] = { id, type: 'text', name: id, role: 'blank', position: { x, y: 100 }, locked,
      display: { width: 280, height: 180 }, versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now }
    snapshot.nodeOrder.push(id)
  }
  saveCanvasSnapshot(localStorage, snapshot)
  hydrateCanvasSession(localStorage, now)
}

function mouse(type: string, target: Element | Window, x: number, y: number) {
  const view = window
  const event = new MouseEvent(type, { bubbles: true, button: 0, buttons: type === 'mouseup' ? 0 : 1, clientX: x, clientY: y })
  Object.defineProperty(event, 'view', { value: view })
  fireEvent(target, event)
}

function rectangle(pane: Element, start: [number, number], end: [number, number]) {
  for (const [type, point] of [['pointerdown', start], ['pointermove', end], ['pointerup', end]] as const) {
    pointer(type, pane, point[0], point[1])
  }
}

function pointer(type: string, pane: Element, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
  Object.defineProperties(event, { isPrimary: { value: true }, pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
  fireEvent(pane, event)
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set(), selectedEdgeIds: new Set() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(SVGElement.prototype, 'getBBox')
  Reflect.deleteProperty(document, 'elementFromPoint')
})

function installConnectionGeometry() {
  vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1 })
  Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true, value: () => ({ x: 0, y: 0, width: 32, height: 16 }) })
}

function MeasureConnectionHandles() {
  const update = useUpdateNodeInternals()
  const snapshot = useCanvasSessionStore((state) => state.snapshot)
  useEffect(() => {
    const frame = requestAnimationFrame(() => update(snapshot.nodeOrder.map(toFlowNodeId)))
    return () => cancelAnimationFrame(frame)
  }, [update, snapshot])
  return null
}

function renderCanvas(measureHandles = false) {
  return render(
    <ReactFlowProvider>
      <WorkspaceShell viewControls={<ViewControls />}><CanvasSurface /></WorkspaceShell>
      {measureHandles && <MeasureConnectionHandles />}
    </ReactFlowProvider>,
  )
}

function connect(source = 'a', target = 'b') {
  // jsdom has no hit testing; real React Flow still owns connection callbacks.
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => null })
  fireEvent.click(screen.getByRole('button', { name: `${source}：发起连接`.replace(/\s+/g, ' ').trim() }))
  fireEvent.click(screen.getByRole('button', { name: `${target}：接受连接`.replace(/\s+/g, ' ').trim() }), { clientX: 510, clientY: 190 })
}

function flowNode(domainId: string) {
  return screen.getByTestId(`rf__node-${toFlowNodeId(domainId)}`)
}

function finishConnectionGesture(source: Element, target: Element) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
  pointer('pointerdown', source, 380, 190)
  mouse('mousedown', source, 380, 190)
  pointer('pointermove', target, 500, 190)
  mouse('mousemove', document.documentElement, 500, 190)
  pointer('pointerup', target, 500, 190)
  mouse('mouseup', target, 500, 190)
  // Chromium sends the release click to the common source/target ancestor.
  fireEvent.click(document.querySelector('.react-flow__nodes')!, { clientX: 500, clientY: 190, detail: 1 })
}

describe('CanvasSurface', () => {
  it.each(['Delete', 'Backspace'])('selects_a_saved_css_sensitive_edge_and_%s_deletes_only_it_with_history_and_focus', async (key) => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById = {
      'quote"edge\\]': { id: 'quote"edge\\]', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null },
      other: { id: 'other', sourceNodeId: 'b', targetNodeId: 'locked', relationType: 'derived', sourceVersionId: null },
    }
    snapshot.edgeOrder = ['quote"edge\\]', 'other']
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    installConnectionGeometry()
    renderCanvas(true)
    const edge = (await screen.findAllByLabelText('连线'))[0]
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('article', { name: 'a · 文本节点' }))
    fireEvent.click(edge)
    expect([...useCanvasInteractionStore.getState().selectedEdgeIds]).toEqual(['quote"edge\\]'])
    expect(useCanvasInteractionStore.getState().selectedNodeIds.size).toBe(0)
    expect(edge).toHaveClass('selected')
    expect(edge).toHaveAttribute('aria-pressed', 'true')
    expect(edge).toHaveAccessibleName('连线（已选中）')
    expect(writes).not.toHaveBeenCalled()
    edge.focus()
    fireEvent.keyDown(edge, { key })
    const deleted = useCanvasSessionStore.getState().snapshot
    expect(deleted.edgeOrder).toEqual(['other'])
    expect(deleted.nodesById).toBe(before.nodesById)
    expect(deleted.nodeOrder).toBe(before.nodeOrder)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).edgeOrder).toEqual(['other'])
    expect(writes).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const canvas = screen.getByRole('region', { name: '无限画布' })
    expect(canvas).toHaveFocus()
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已删除 1 条关系；节点已保留')
    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true })
    expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    fireEvent.keyDown(canvas, { key: 'y', ctrlKey: true })
    expect(useCanvasSessionStore.getState().snapshot).toEqual(deleted)
    expect(writes).toHaveBeenCalledTimes(3)
  })

  it('shift_toggles_edges_and_deletes_a_batch_with_one_undo_and_clears_on_node_or_pane', async () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById = {
      first: { id: 'first', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null },
      second: { id: 'second', sourceNodeId: 'b', targetNodeId: 'locked', relationType: 'derived', sourceVersionId: null },
    }
    snapshot.edgeOrder = ['first', 'second']
    installConnectionGeometry()
    renderCanvas(true)
    const [first, second] = await screen.findAllByLabelText('连线')
    const canvas = screen.getByRole('region', { name: '无限画布' })
    fireEvent.click(first)
    fireEvent.click(second, { shiftKey: true })
    fireEvent.click(first, { shiftKey: true })
    expect([...useCanvasInteractionStore.getState().selectedEdgeIds]).toEqual(['second'])
    fireEvent.click(screen.getByRole('article', { name: 'a · 文本节点' }))
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    fireEvent.click(first)
    const pane = canvas.querySelector('.react-flow__pane')!
    rectangle(pane, [30, 30], [30, 30])
    fireEvent.click(pane)
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    fireEvent.click(first)
    fireEvent.click(second, { shiftKey: true })
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.keyDown(canvas, { key: 'Delete' })
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toEqual([])
    expect(writes).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(useCanvasSessionStore.getState().snapshot).toEqual(snapshot)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '重做' }))
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toEqual([])
    expect(writes).toHaveBeenCalledTimes(3)
  })

  it.each(['Enter', ' '])('keyboard_%s_selects_an_edge_and_pan_mode_does_not', async (key) => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById.edge = { id: 'edge', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder = ['edge']
    installConnectionGeometry()
    renderCanvas(true)
    const edge = await screen.findByLabelText('连线')
    edge.focus()
    fireEvent.keyDown(edge, { key })
    expect([...useCanvasInteractionStore.getState().selectedEdgeIds]).toEqual(['edge'])
    fireEvent.keyDown(edge, { key: 'Escape' })
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: '抓手' }))
    fireEvent.click(edge)
    fireEvent.keyDown(edge, { key })
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
  })

  it('announces_a_stale_edge_delete_as_no_op_without_history_or_save', () => {
    renderCanvas()
    useCanvasInteractionStore.setState({ selectedEdgeIds: new Set(['missing']) })
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const before = useCanvasSessionStore.getState().snapshot
    fireEvent.keyDown(screen.getByRole('region', { name: '无限画布' }), { key: 'Delete' })
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    expect(writes).not.toHaveBeenCalled()
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('没有可删除的关系')
  })
  it('box_selects_only_enclosed_nodes_after_a_measured_projection_is_replaced_by_selection', async () => {
    seedManipulationNodes()
    installConnectionGeometry()
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('react-flow__node') ? 280 : this.classList.contains('react-flow__handle') ? 14 : 1280
    })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('react-flow__node') ? 180 : this.classList.contains('react-flow__handle') ? 14 : 800
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const node = this.closest<HTMLElement>('.react-flow__node')
      const id = node?.getAttribute('data-id')
      const x = id === toFlowNodeId('b') ? 500 : id === toFlowNodeId('locked') ? 900 : 100
      const isNode = this.classList.contains('react-flow__node')
      const isHandle = this.classList.contains('react-flow__handle')
      const left = isNode ? x : isHandle ? x + (this.classList.contains('source') ? 273 : -7) : 0
      const top = isNode ? 100 : isHandle ? 183 : 0
      const width = isNode ? 280 : isHandle ? 14 : 1280
      const height = isNode ? 180 : isHandle ? 14 : 800
      return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) }
    })
    renderCanvas(true)
    await act(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame) })
    fireEvent.click(screen.getByRole('article', { name: 'a · 文本节点' }))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const pane = screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__pane')!
    rectangle(pane, [450, 50], [800, 350])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['b'])
    expect(writes).not.toHaveBeenCalled()
    await act(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame) })
  })

  it('shows_minimap_type_labels_distinct_shapes_safe_ids_and_the_current_viewport', () => {
    const snapshot = createEmptySnapshot('map', now)
    for (const [id, type] of [['quote"node', 'text'], ['slash\\node', 'image'], ['bracket]node', 'video'], ['__proto__', 'audio']] as const) {
      snapshot.nodesById = { ...snapshot.nodesById, [id]: { id, type, name: id, role: 'blank', position: { x: 100, y: 100 },
        locked: false, display: { width: 320, height: 180 }, versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now } }
      snapshot.nodeOrder.push(id)
    }
    snapshot.viewport = { x: 120, y: -70, zoom: 0.75 }
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    renderCanvas()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '小地图' }))
    const map = screen.getByRole('img', { name: '小地图：节点类型与当前视口' })
    for (const [id, label, shape] of [['quote"node', '文本', 'rect'], ['slash\\node', '图片', 'rect[rx]'], ['bracket]node', '视频', 'polygon'], ['__proto__', '音频', 'ellipse']]) {
      const node = within(map).getByRole('img', { name: `${id} · ${label}节点` })
      expect(node).toHaveAttribute('data-id', toFlowNodeId(id))
      expect(node.querySelector(shape)).toBeInTheDocument()
      if (label === '文本' || label === '图片') expect(node.querySelector('rect')).toHaveAttribute('rx', label === '图片' ? '24' : '0')
      expect(node.querySelector('text')).toHaveTextContent(label)
    }
    const mask = map.querySelector('.react-flow__minimap-mask')!
    expect(mask.getAttribute('d')).toContain('M-160,93.33333333333333h1706.6666666666667v1066.6666666666667')
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['quote"node', 'slash\\node', 'bracket]node', '__proto__'])
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
  })

  it('lays_out_relations_once_preserves_locked_positions_and_undo_redo_restores_exact_geometry', async () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById.edge = { id: 'edge', sourceNodeId: 'a', targetNodeId: 'b', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder = ['edge']
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    installConnectionGeometry()
    renderCanvas()
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    const arranged = useCanvasSessionStore.getState().snapshot
    expect(arranged.nodesById.a.position).toEqual({ x: 0, y: 0 })
    expect(arranged.nodesById.b.position).toEqual({ x: 400, y: 0 })
    expect(arranged.nodesById.locked.position).toEqual({ x: 900, y: 100 })
    expect(flowNode('b')).toHaveStyle({ transform: 'translate(400px,0px)' })
    fireEvent.click(screen.getByRole('button', { name: '自动整理卡片' }))
    expect(useCanvasSessionStore.getState().snapshot).toBe(arranged)
    expect(writes).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
    expect(flowNode('b')).toHaveStyle({ transform: 'translate(500px,100px)' })
    expect(screen.getByRole('button', { name: '撤销' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '重做' }))
    expect(useCanvasSessionStore.getState().snapshot).toEqual(arranged)
    expect(writes).toHaveBeenCalledTimes(3)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodesById.b.position).toEqual({ x: 400, y: 0 })
    connect()
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toHaveLength(2)
  })

  it('persists_only_the_final_viewport_after_an_animated_reset', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    const snapshot = createEmptySnapshot('animated', now)
    snapshot.viewport = { x: 120, y: -70, zoom: 0.75 }
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    renderCanvas()
    const before = useCanvasSessionStore.getState().snapshot
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(stored)
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('100%'))
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1))
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
  })

  it('creates a plain connection immediately without asking for a relation type', async () => {
    seedManipulationNodes()
    installConnectionGeometry()
    renderCanvas(true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })

    finishConnectionGesture(screen.getByRole('button', { name: 'a：发起连接' }), screen.getByRole('button', { name: 'b：接受连接' }))

    await waitFor(() => expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toHaveLength(1))
    expect(screen.queryByRole('menu', { name: '选择关系类型' })).not.toBeInTheDocument()
    const snapshot = useCanvasSessionStore.getState().snapshot
    expect(snapshot.edgeOrder).toHaveLength(1)
    expect(snapshot.edgesById[snapshot.edgeOrder[0]]).toMatchObject({
      sourceNodeId: 'a',
      targetNodeId: 'b',
      relationType: 'instruction',
    })
  })

  it('opens the node picker at an empty connection endpoint and connects the chosen node', async () => {
    seedManipulationNodes()
    installConnectionGeometry()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const width = this.classList.contains('node-create-menu') ? 220 : 1280
      const height = this.classList.contains('node-create-menu') ? 350 : 800
      return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({}) }
    })
    renderCanvas(true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => null })

    const source = screen.getByRole('button', { name: 'a：发起连接' })
    mouse('mousedown', source, 380, 190)
    mouse('mousemove', document.documentElement, 720, 360)
    mouse('mouseup', document.documentElement, 720, 360)
    fireEvent.click(document.querySelector('.react-flow__nodes')!, { clientX: 720, clientY: 360, detail: 1 })

    const menu = await screen.findByRole('menu', { name: '添加节点类型' })
    expect(menu).toHaveStyle({ left: '720px', top: '360px' })
    expect(useCanvasInteractionStore.getState().createMenu).toMatchObject({
      flowPosition: { x: 720, y: 360 }, sourceNodeId: 'a',
    })
    await userEvent.setup().click(within(menu).getByRole('menuitem', { name: '图片' }))

    const snapshot = useCanvasSessionStore.getState().snapshot
    const createdId = snapshot.nodeOrder.at(-1)!
    expect(snapshot.nodesById[createdId]).toMatchObject({ type: 'image', position: { x: 720, y: 360 } })
    expect(snapshot.edgesById[snapshot.edgeOrder.at(-1)!]).toMatchObject({ sourceNodeId: 'a', targetNodeId: createdId, relationType: 'instruction' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it.each(['quote"node', 'slash\\node', 'bracket]node', ' white space ', '__proto__'])('connects_css_sensitive_domain_id_%s_with_original_ids_one_save_and_undo', async (id) => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.nodesById = { ...snapshot.nodesById, [id]: { ...snapshot.nodesById.b, id, name: id } }
    snapshot.nodeOrder = [...snapshot.nodeOrder, id]
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    renderCanvas()
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const errors: Event[] = []
    const errorListener = (event: Event) => { errors.push(event); event.preventDefault() }
    window.addEventListener('error', errorListener)
    try {
      connect('a', id)
      expect(errors).toEqual([])
      const result = useCanvasSessionStore.getState().snapshot
      expect(result.edgesById[result.edgeOrder[0]]).toMatchObject({ sourceNodeId: 'a', targetNodeId: id })
      expect(result.nodeOrder).toEqual(['a', 'b', 'locked', id])
      expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).edgesById[result.edgeOrder[0]].targetNodeId).toBe(id)
      expect(writes).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
      act(() => { useCanvasSessionStore.getState().undo() })
      expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
      expect(useCanvasSessionStore.getState().canUndo).toBe(false)
      connect(id, 'b')
      const reversed = useCanvasSessionStore.getState().snapshot
      expect(reversed.edgesById[reversed.edgeOrder[0]]).toMatchObject({ sourceNodeId: id, targetNodeId: 'b' })
      expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodesById[id].id).toBe(id)
      expect(errors).toEqual([])
    } finally {
      window.removeEventListener('error', errorListener)
    }
  })

  it.each(['quote"node', 'slash\\node', 'bracket]node', ' white space ', '__proto__'])('maps_selection_drag_preview_commit_and_delete_for_domain_id_%s', async (id) => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.nodesById = { ...snapshot.nodesById, [id]: { ...snapshot.nodesById.a, id, name: id, position: { x: 100, y: 400 } } }
    snapshot.nodeOrder = [...snapshot.nodeOrder, id]
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    renderCanvas()
    const node = flowNode(id)
    fireEvent.click(node)
    fireEvent.click(flowNode('b'), { shiftKey: true })
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual([id, 'b'])
    fireEvent.click(flowNode('b'), { shiftKey: true })
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    mouse('mousedown', node, 150, 450)
    mouse('mousemove', window, 190, 480)
    mouse('mousemove', window, 230, 500)
    const heldPreview = node.style.transform
    const heldSnapshot = useCanvasSessionStore.getState().snapshot
    const heldWrites = writes.mock.calls.length
    mouse('mouseup', window, 230, 500)
    expect(heldPreview).toBe('translate(140px,420px)')
    expect(heldSnapshot).toBe(before)
    expect(heldWrites).toBe(0)
    expect(useCanvasSessionStore.getState().snapshot.nodesById[id].position).toEqual({ x: 140, y: 420 })
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodesById[id].position).toEqual({ x: 140, y: 420 })
    expect(writes).toHaveBeenCalledTimes(1)
    act(() => { useCanvasSessionStore.getState().undo() })
    expect(useCanvasSessionStore.getState().snapshot).toEqual(before)
    node.focus()
    fireEvent.keyDown(node, { key: 'Delete' })
    await userEvent.setup().click(screen.getByRole('button', { name: '确认删除' }))
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a', 'b', 'locked'])
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
    expect(writes).toHaveBeenCalledTimes(3)
  })

  it('drags_between_css_sensitive_ids_and_rejects_the_original_locked_or_self_endpoints', async () => {
    seedManipulationNodes()
    const sourceId = 'quote"node'
    const targetId = 'slash\\node'
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.nodesById = { ...snapshot.nodesById,
      [sourceId]: { ...snapshot.nodesById.a, id: sourceId, name: sourceId },
      [targetId]: { ...snapshot.nodesById.b, id: targetId, name: targetId },
    }
    snapshot.nodeOrder = [...snapshot.nodeOrder, sourceId, targetId]
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    installConnectionGeometry()
    renderCanvas(true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const source = screen.getByRole('button', { name: `${sourceId}：发起连接` })
    const target = screen.getByRole('button', { name: `${targetId}：接受连接` })
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    finishConnectionGesture(source, target)
    let current = useCanvasSessionStore.getState().snapshot
    expect(current.edgesById[current.edgeOrder[0]]).toMatchObject({ sourceNodeId: sourceId, targetNodeId: targetId })
    expect(writes).toHaveBeenCalledTimes(1)
    act(() => { useCanvasSessionStore.getState().executeCommand({ type: 'set-node-lock', nodeIds: [targetId], locked: true, now }) })
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    current = useCanvasSessionStore.getState().snapshot
    writes.mockClear()
    expect(screen.queryByRole('button', { name: `${targetId}：接受连接` })).not.toBeInTheDocument()
    mouse('mousedown', source, 380, 190)
    mouse('mousemove', document.documentElement, 500, 190)
    mouse('mouseup', document.documentElement, 500, 190)
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveTextContent('锁定')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(useCanvasSessionStore.getState().snapshot).toBe(current)
    expect(writes).not.toHaveBeenCalled()
    connect(sourceId, sourceId)
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveTextContent('自身')
    expect(writes).not.toHaveBeenCalled()
  })

  it('exposes_accessible_handles_only_for_unlocked_nodes', () => {
    seedManipulationNodes()
    renderCanvas()
    for (const id of ['a', 'b']) {
      expect(screen.getByRole('button', { name: `${id}：发起连接` })).toHaveAttribute('tabindex', '0')
      expect(screen.getByRole('button', { name: `${id}：接受连接` })).toHaveAttribute('tabindex', '0')
    }
    expect(within(flowNode('locked')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('rejects_self_connection_with_nearby_announced_reason_and_no_partial_edge', () => {
    seedManipulationNodes()
    renderCanvas()
    const feedback = screen.getByRole('status', { name: '连接提示' })
    expect(feedback).toBeEmptyDOMElement()
    expect(feedback).toHaveAttribute('aria-live', 'polite')
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    connect('a', 'a')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveTextContent('自身')
    expect(screen.getByRole('status', { name: '连接提示' })).toBe(feedback)
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveStyle({ position: 'fixed' })
    expect(document.querySelector('.react-flow__connection')).not.toBeInTheDocument()
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(writes).not.toHaveBeenCalled()
    const firstReason = feedback.textContent
    connect('a', 'a')
    expect(feedback).toHaveTextContent('自身')
    expect(feedback.textContent).not.toBe(firstReason)
  })

  it('announces_no_allowed_type_when_all_relations_exist', () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    for (const relationType of ['instruction', 'reference', 'derived'] as const) {
      snapshot.edgesById[relationType] = { id: relationType, sourceNodeId: 'a', targetNodeId: 'b', relationType, sourceVersionId: null }
      snapshot.edgeOrder.push(relationType)
    }
    renderCanvas()
    connect()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveTextContent('已存在')
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
  })

  it('retains_passive_edge_anchors_when_reloading_a_locked_connected_node', async () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById.edge = { id: 'edge', sourceNodeId: 'a', targetNodeId: 'locked', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder = ['edge']
    installConnectionGeometry()
    renderCanvas(true)
    const locked = flowNode('locked')
    const anchors = locked.querySelectorAll('.react-flow__handle')
    expect(anchors).toHaveLength(2)
    for (const anchor of anchors) {
      expect(anchor).not.toHaveClass('connectable')
      expect(anchor).toHaveAttribute('aria-hidden', 'true')
      expect(anchor).toHaveAttribute('tabindex', '-1')
    }
    expect(within(locked).queryByRole('button')).not.toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.react-flow__edge-path')).toBeInTheDocument())
  })

  it('completes_a_real_drag_connection_and_saves_immediately', async () => {
    seedManipulationNodes()
    installConnectionGeometry()
    renderCanvas(true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const source = screen.getByRole('button', { name: 'a：发起连接' })
    const target = screen.getByRole('button', { name: 'b：接受连接' })
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    mouse('mousedown', source, 380, 190)
    mouse('mousemove', document.documentElement, 500, 190)
    mouse('mouseup', document.documentElement, 500, 190)
    expect(screen.queryByRole('menu', { name: '选择关系类型' })).not.toBeInTheDocument()
    expect(document.querySelector('.react-flow__connection')).not.toBeInTheDocument()
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toHaveLength(1)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('announces_locked_target_rejection_after_drag_without_menu_edge_or_save', async () => {
    seedManipulationNodes()
    installConnectionGeometry()
    renderCanvas(true)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const target = flowNode('locked').querySelector('.react-flow__handle.target')!
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target })
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    mouse('mousedown', screen.getByRole('button', { name: 'a：发起连接' }), 380, 190)
    mouse('mousemove', document.documentElement, 900, 190)
    mouse('mouseup', document.documentElement, 900, 190)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '连接提示' })).toHaveTextContent('锁定')
    expect(document.querySelector('.react-flow__connection')).not.toBeInTheDocument()
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(writes).not.toHaveBeenCalled()
  })

  it('keyboard_handles_complete_connection_without_changing_selection', () => {
    seedManipulationNodes()
    useCanvasInteractionStore.getState().replaceSelection(['b'])
    renderCanvas()
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => null })
    const source = screen.getByRole('button', { name: 'a：发起连接' })
    const target = screen.getByRole('button', { name: 'b：接受连接' })
    source.focus()
    fireEvent.keyDown(source, { key: 'Enter' })
    target.focus()
    fireEvent.keyDown(target, { key: ' ' })
    expect(screen.queryByRole('menu', { name: '选择关系类型' })).not.toBeInTheDocument()
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toHaveLength(1)
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['b'])
  })

  it('does_not_persist_viewport_during_or_after_a_box_selection_at_the_screen_edge', async () => {
    seedManipulationNodes()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    const pane = screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__pane')!
    const snapshot = useCanvasSessionStore.getState().snapshot
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    pointer('pointerdown', pane, 450, 50)
    pointer('pointermove', pane, 1270, 500)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const writesWhileHeld = writes.mock.calls.length
    const snapshotWhileHeld = useCanvasSessionStore.getState().snapshot
    const viewportWhileHeld = { ...snapshotWhileHeld.viewport }
    pointer('pointerup', pane, 1270, 500)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)) })
    expect(writesWhileHeld).toBe(0)
    expect(snapshotWhileHeld).toBe(snapshot)
    expect(viewportWhileHeld).toEqual({ x: 0, y: 0, zoom: 1 })
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['b', 'locked'])
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(stored)
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
  })

  it('previews_proto_named_node_during_drag_and_commits_once_at_stop', () => {
    seedManipulationNodes()
    const source = useCanvasSessionStore.getState().snapshot.nodesById.a
    useCanvasSessionStore.getState().executeCommand({ type: 'create-node', node: { ...source, id: '__proto__', name: 'proto', position: { x: 100, y: 400 } } })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    useCanvasInteractionStore.getState().replaceSelection(['__proto__'])
    renderCanvas()
    const node = flowNode('__proto__')
    const snapshot = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    mouse('mousedown', node, 150, 450)
    mouse('mousemove', window, 190, 480)
    mouse('mousemove', window, 230, 500)
    const previewWhileHeld = node.style.transform
    const snapshotWhileHeld = useCanvasSessionStore.getState().snapshot
    const writesWhileHeld = writes.mock.calls.length
    mouse('mouseup', window, 230, 500)
    expect(previewWhileHeld).toBe('translate(140px,420px)')
    expect(snapshotWhileHeld).toBe(snapshot)
    expect(snapshot.nodesById['__proto__'].position).toEqual({ x: 100, y: 400 })
    expect(writesWhileHeld).toBe(0)
    expect(useCanvasSessionStore.getState().snapshot.nodesById['__proto__'].position).toEqual({ x: 140, y: 420 })
    expect(writes).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodesById['__proto__'].position).toEqual({ x: 140, y: 420 })
    act(() => { useCanvasSessionStore.getState().undo() })
    expect(useCanvasSessionStore.getState().snapshot.nodesById['__proto__'].position).toEqual({ x: 100, y: 400 })
  })

  it('returns_focus_to_canvas_when_undo_removes_the_focused_created_node', () => {
    seedManipulationNodes()
    const node = useCanvasSessionStore.getState().snapshot.nodesById.a
    useCanvasSessionStore.getState().executeCommand({ type: 'create-node', node: { ...node, id: 'new' } })
    useCanvasInteractionStore.getState().replaceSelection(['new'])
    renderCanvas()
    const requester = flowNode('new')
    requester.focus()
    fireEvent.keyDown(requester, { key: 'z', ctrlKey: true })
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a', 'b', 'locked'])
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
  })

  it('keeps_keyboard_focus_on_the_canvas_when_a_duplicate_shortcut_collapses_the_requesting_control', () => {
    seedManipulationNodes()
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    const requester = screen.getByRole('button', { name: '锁定节点' })
    requester.focus()
    fireEvent.keyDown(requester, { key: 'd', ctrlKey: true })
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toHaveLength(4)
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
  })

  it('projects_the_domain_position_for_ids_matching_object_prototype_properties', () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    const original = snapshot.nodesById.a
    delete snapshot.nodesById.a
    snapshot.nodesById = { ...snapshot.nodesById, constructor: { ...original, id: 'constructor' } }
    snapshot.nodeOrder[0] = 'constructor'
    renderCanvas()
    expect(flowNode('constructor')).toHaveStyle({ transform: 'translate(100px,100px)' })
  })

  it('restores_the_requesting_rail_control_after_confirming_deletion', async () => {
    seedManipulationNodes()
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    const requester = screen.getByRole('button', { name: '鼠标选择' })
    requester.focus()
    fireEvent.keyDown(requester, { key: 'Delete' })
    await userEvent.setup().click(screen.getByRole('button', { name: '确认删除' }))
    expect(requester).toHaveFocus()
  })

  it('does_not_persist_drag_frames_when_the_pointer_reaches_the_viewport_edge', async () => {
    seedManipulationNodes()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const snapshot = useCanvasSessionStore.getState().snapshot
    mouse('mousedown', flowNode('a'), 150, 150)
    mouse('mousemove', window, 1245, 150)
    mouse('mousemove', window, 1270, 150)
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    mouse('mouseup', window, 1270, 150)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('returns_focus_to_the_canvas_when_confirm_deletes_the_requesting_node', async () => {
    seedManipulationNodes()
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    const requester = flowNode('a')
    requester.focus()
    fireEvent.keyDown(requester, { key: 'Delete' })
    await userEvent.setup().click(screen.getByRole('button', { name: '确认删除' }))
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
  })

  it('returns_focus_to_the_canvas_after_the_duplicate_control_collapses', async () => {
    seedManipulationNodes()
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    renderCanvas()
    await userEvent.setup().click(screen.getByRole('button', { name: '创建副本' }))
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toHaveLength(4)
    expect(screen.getByRole('region', { name: '无限画布' })).toHaveFocus()
  })

  it('single_selects_shift_toggles_and_clears_on_empty_click_without_saving', () => {
    seedManipulationNodes()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    renderCanvas()
    fireEvent.click(flowNode('a'))
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['a'])
    expect(screen.getByRole('article', { name: 'a · 文本节点' })).toHaveAttribute('data-layout', 'expanded')
    fireEvent.click(flowNode('b'), { shiftKey: true })
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['a', 'b'])
    expect(screen.getAllByRole('article').every((node) => node.getAttribute('data-layout') === 'compact')).toBe(true)
    fireEvent.click(flowNode('a'), { shiftKey: true })
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['b'])
    const pane = screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__pane')!
    rectangle(pane, [30, 30], [30, 30])
    fireEvent.click(pane)
    expect(useCanvasInteractionStore.getState().selectedNodeIds.size).toBe(0)
    expect(writes).not.toHaveBeenCalled()
  })

  it('box_selection_replaces_previous_selection_and_pan_prevents_selection', async () => {
    seedManipulationNodes()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    useCanvasInteractionStore.getState().replaceSelection(['locked'])
    renderCanvas()
    const pane = screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__pane')!
    rectangle(pane, [50, 50], [800, 350])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['a', 'b'])
    await userEvent.setup().click(screen.getByRole('button', { name: '抓手' }))
    fireEvent.click(flowNode('locked'))
    rectangle(pane, [50, 50], [1200, 500])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['a', 'b'])
    expect(flowNode('a')).not.toHaveClass('draggable')
  })

  it('previews_multi_drag_without_saving_then_commits_once_and_undo_restores_all', async () => {
    seedManipulationNodes()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    useCanvasInteractionStore.getState().replaceSelection(['a', 'b', 'locked'])
    renderCanvas()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const before = useCanvasSessionStore.getState().snapshot
    mouse('mousedown', flowNode('a'), 150, 150)
    mouse('mousemove', window, 190, 180)
    mouse('mousemove', window, 210, 190)
    // React Flow establishes the drag origin at the first move past its threshold.
    expect(flowNode('a')).toHaveStyle({ transform: 'translate(120px,110px)' })
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(writes).not.toHaveBeenCalled()
    mouse('mouseup', window, 210, 190)
    await waitFor(() => expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 120, y: 110 }))
    expect(useCanvasSessionStore.getState().snapshot.nodesById.b.position).toEqual({ x: 520, y: 110 })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.locked.position).toEqual({ x: 900, y: 100 })
    expect(writes).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已移动 2 个节点')
    act(() => { useCanvasSessionStore.getState().undo() })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.a.position).toEqual({ x: 100, y: 100 })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.b.position).toEqual({ x: 500, y: 100 })
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
  })

  it('keeps_locked_nodes_selectable_but_does_not_move_or_save_them', () => {
    seedManipulationNodes()
    renderCanvas()
    fireEvent.click(flowNode('locked'))
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['locked'])
    const before = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    mouse('mousedown', flowNode('locked'), 950, 150)
    mouse('mousemove', window, 1010, 210)
    mouse('mouseup', window, 1010, 210)
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    expect(writes).not.toHaveBeenCalled()
    expect(flowNode('locked')).not.toHaveClass('draggable')
  })

  it('confirms_one_deletion_with_incident_edges_retains_locked_nodes_and_restores_focus', async () => {
    seedManipulationNodes()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.edgesById.edge = { id: 'edge', sourceNodeId: 'a', targetNodeId: 'locked', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder = ['edge']
    useCanvasInteractionStore.getState().replaceSelection(['a', 'b', 'locked'])
    renderCanvas()
    const canvas = screen.getByRole('region', { name: '无限画布' })
    canvas.focus()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.keyDown(canvas, { key: 'Delete' })
    expect(screen.getByRole('dialog')).toHaveTextContent('删除 2 个节点及 1 条关联关系')
    expect(screen.getByRole('dialog')).toHaveTextContent('1 个锁定节点将保留')
    await userEvent.setup().click(screen.getByRole('button', { name: '取消' }))
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(writes).not.toHaveBeenCalled()
    expect(canvas).toHaveFocus()
    fireEvent.keyDown(canvas, { key: 'Backspace' })
    await userEvent.setup().click(screen.getByRole('button', { name: '确认删除' }))
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['locked'])
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toEqual([])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['locked'])
    expect(writes).toHaveBeenCalledTimes(1)
    expect(canvas).toHaveFocus()
    expect(screen.getByRole('status', { name: '画布操作结果' })).toHaveTextContent('已删除 2 个节点及 1 条关联关系；保留 1 个锁定节点')
  })

  it('renders_an_empty_labelled_canvas_with_dot_grid', () => {
    renderCanvas()
    const canvas = screen.getByRole('region', { name: '无限画布' })
    expect(within(canvas).getByText('双击画布添加新卡片')).toBeInTheDocument()
    const background = within(canvas).getByTestId('rf__background')
    expect(background.querySelector('pattern circle')).toBeInTheDocument()
    expect(canvas.querySelectorAll('.react-flow__node, .react-flow__edge')).toHaveLength(0)
  })

  it('renders_view_controls_in_verified_order', () => {
    renderCanvas()
    const controls = screen.getByRole('toolbar', { name: '视图控制' })
    expect(Array.from(controls.children).filter((child) => !child.hasAttribute('hidden')).map(
      (child) => child.getAttribute('aria-label') ?? child.textContent,
    )).toEqual(['小地图', '自动整理卡片', '缩小', '当前缩放比例', '放大', '重置'])
    expect(within(controls).getByLabelText('当前缩放比例')).toHaveTextContent('100%')
  })

  it('keeps_future_actions_disabled', () => {
    renderCanvas()
    expect(screen.getByRole('button', { name: '剪辑' })).toBeEnabled()
    for (const name of ['模板', '历史', '帮助']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
      expect(screen.getByRole('button', { name })).toHaveAccessibleDescription('后续阶段开放')
    }
    for (const name of ['小地图', '自动整理卡片', '缩小', '放大', '重置']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
  })

  it('publishes_reduced_motion_overrides', () => {
    expect(globalCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(globalCss).toContain('animation-duration: 0.01ms')
    expect(globalCss).toContain('transition-duration: 0.01ms')
    expect(globalCss).toContain('animation-iteration-count: 1')
  })

  it('zooms_with_the_real_flow_and_persists_the_finished_viewport', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    const user = userEvent.setup()
    renderCanvas()
    await user.click(screen.getByRole('button', { name: '放大' }))
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('120%'))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport.zoom).toBeCloseTo(1.2))
    await user.click(screen.getByRole('button', { name: '缩小' }))
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('100%'))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport.zoom).toBeCloseTo(1))
  })

  it('resets_a_panned_zoomed_canvas_to_the_empty_viewport', async () => {
    const snapshot = createEmptySnapshot('saved-canvas', now)
    snapshot.viewport = { x: 120, y: -70, zoom: 0.75 }
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    const user = userEvent.setup()
    renderCanvas()
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('75%'))
    await user.click(screen.getByRole('button', { name: '重置' }))
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('100%'))
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('starts_the_app_with_the_hydrated_viewport', async () => {
    const snapshot = createEmptySnapshot('saved-canvas', now)
    snapshot.viewport = { x: 25, y: -40, zoom: 1.5 }
    saveCanvasSnapshot(localStorage, snapshot)
    render(<CanvasApp theme="original" />)
    await waitFor(() => expect(screen.getByLabelText('当前缩放比例')).toHaveTextContent('150%'))
    expect(screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__viewport'))
      .toHaveStyle({ transform: 'translate(25px,-40px) scale(1.5)' })
  })

  it('saves_the_viewport_when_a_pan_gesture_ends', async () => {
    renderCanvas()
    await userEvent.setup().click(screen.getByRole('button', { name: '抓手' }))
    const pane = screen.getByRole('region', { name: '无限画布' }).querySelector('.react-flow__pane')!
    const view = pane.ownerDocument.defaultView!
    // jsdom's Window brand check rejects Vitest's wrapped window in MouseEventInit.
    // Attach the browser's event.view after construction so d3 receives its window.
    for (const [type, target, x, y] of [
      ['mousedown', pane, 300, 300],
      ['mousemove', view, 360, 340],
      ['mouseup', view, 360, 340],
    ] as const) {
      const event = new MouseEvent(type, { bubbles: true, button: 0, buttons: type === 'mouseup' ? 0 : 1, clientX: x, clientY: y })
      Object.defineProperty(event, 'view', { value: view })
      fireEvent(target, event)
    }
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport)
      .toEqual({ x: 60, y: 40, zoom: 1 }))
  })

  it.each([
    ['文本', 'text', '文本节点', 358, 270],
    ['图片', 'image', '图片节点', 358, 270],
    ['视频', 'video', '视频节点', 358, 270],
    ['音频', 'audio', '音频节点', 320, 180],
  ] as const)('creates_a_complete_%s_node_at_the_converted_viewport_center', async (choice, type, name, width, height) => {
    const snapshot = createEmptySnapshot('saved', now)
    snapshot.viewport = { x: 120, y: -70, zoom: 0.5 }
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800, toJSON: () => ({}) })
    const id = '00000000-0000-4000-8000-000000000001'
    const uuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(id)
    const user = userEvent.setup()
    useCanvasInteractionStore.getState().replaceSelection(['previous', 'other'])
    renderCanvas()
    await user.click(screen.getByRole('button', { name: '添加节点' }))
    expect(useCanvasInteractionStore.getState().createMenu?.flowPosition).toEqual({ x: 1040, y: 940 })
    await user.click(screen.getByRole('menuitem', { name: choice }))
    const result = useCanvasSessionStore.getState().snapshot
    expect(result.nodeOrder).toEqual([id])
    const node = result.nodesById[id]
    expect(node).toEqual({ id, type, role: 'blank', name, position: { x: 1040, y: 940 }, locked: false, display: { width, height },
      input: createEmptyNodeInput(), versionIds: [], currentVersionId: null, taskId: null,
      createdAt: expect.any(String), updatedAt: expect.any(String) })
    expect(node.createdAt).toBe(node.updatedAt)
    expect(uuid).toHaveBeenCalledTimes(1)
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual([id])
    expect(screen.getByRole('article', { name: `${name} · ${choice}节点` })).toBeInTheDocument()
    expect(screen.queryByText('双击画布添加新卡片')).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加节点' })).toHaveFocus()
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodeOrder).toEqual([id])
    const announcement = screen.getByRole('status', { name: '节点创建结果' })
    expect(announcement).toHaveAttribute('aria-live', 'polite')
    expect(announcement).toHaveAttribute('aria-atomic', 'true')
    expect(announcement).toHaveTextContent(`已创建${choice}节点`)
    expect(JSON.stringify(result)).not.toContain('已创建')
  })

  it('announces_repeated_creation_of_the_same_type_with_a_fresh_result', async () => {
    const user = userEvent.setup()
    renderCanvas()
    const announcement = screen.getByRole('status', { name: '节点创建结果' })
    expect(announcement).toBeEmptyDOMElement()
    await user.click(screen.getByRole('button', { name: '添加节点' }))
    await user.click(screen.getByRole('menuitem', { name: '文本' }))
    const first = announcement.textContent
    expect(first).toContain('已创建文本节点')
    await user.click(screen.getByRole('button', { name: '添加节点' }))
    await user.click(screen.getByRole('menuitem', { name: '文本' }))
    expect(announcement).toHaveTextContent('已创建文本节点')
    expect(announcement.textContent).not.toBe(first)
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toHaveLength(2)
  })

  it('opens_at_empty_pane_pointer_and_ignores_node_double_click', async () => {
    const snapshot = createEmptySnapshot('saved', now)
    snapshot.viewport = { x: 100, y: -40, zoom: 2 }
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    const user = userEvent.setup()
    renderCanvas()
    const canvas = screen.getByRole('region', { name: '无限画布' })
    fireEvent.doubleClick(canvas.querySelector('.react-flow__pane')!, { clientX: 300, clientY: 200 })
    expect(screen.getByRole('menu')).toBeInTheDocument()
    const menu = useCanvasInteractionStore.getState().createMenu!
    expect(menu.anchor).toEqual({ x: 300, y: 200 })
    expect(menu.flowPosition).toEqual({ x: 100, y: 120 })
    expect(menu.trigger).toBe(canvas)
    await user.click(screen.getByRole('menuitem', { name: '文本' }))
    const node = Object.values(useCanvasSessionStore.getState().snapshot.nodesById)[0]
    expect(node.position).toEqual({ x: 100, y: 120 })
    expect(canvas).toHaveFocus()
    fireEvent.doubleClick(canvas.querySelector('.react-flow__node')!, { clientX: 310, clientY: 210 })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('rejected_creation_closes_and_keeps_the_previous_selection', async () => {
    const user = userEvent.setup()
    const id = '00000000-0000-4000-8000-000000000001'
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(id)
    renderCanvas()
    await user.click(screen.getByRole('button', { name: '添加节点' }))
    await user.click(screen.getByRole('menuitem', { name: '文本' }))
    const snapshot = useCanvasSessionStore.getState().snapshot
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    const announcement = screen.getByRole('status', { name: '节点创建结果' })
    const acceptedResult = announcement.textContent
    expect(announcement).toHaveTextContent('已创建文本节点')
    await user.click(screen.getByRole('button', { name: '添加节点' }))
    await user.click(screen.getByRole('menuitem', { name: '图片' }))
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBe(stored)
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual([id])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual([id])
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加节点' })).toHaveFocus()
    expect(announcement.textContent).toBe(acceptedResult)
    expect(announcement).not.toHaveTextContent('图片节点')
  })
})
