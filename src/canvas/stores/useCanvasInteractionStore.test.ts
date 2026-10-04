import { beforeEach, describe, expect, it } from 'vitest'
import { hydrateCanvasSession, renameCanvas, useCanvasSessionStore } from './useCanvasSessionStore'
import { useCanvasInteractionStore } from './useCanvasInteractionStore'
import { CANVAS_STORAGE_KEY } from '../features/persistence/canvasSnapshot'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, '2026-10-04T00:00:00.000Z')
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set(), selectedEdgeIds: new Set() })
})

describe('canvas interaction session', () => {
  it('keeps_node_and_edge_selection_mutually_exclusive_and_clears_both_without_saving', () => {
    const snapshot = useCanvasSessionStore.getState().snapshot
    const state = useCanvasInteractionStore.getState()
    const ids = ['quote"edge']
    state.replaceSelection(['node'])
    state.replaceEdgeSelection(ids)
    ids.push('late')
    expect([...useCanvasInteractionStore.getState().selectedEdgeIds]).toEqual(['quote"edge'])
    expect(useCanvasInteractionStore.getState().selectedNodeIds.size).toBe(0)
    state.toggleEdgeSelection('other')
    state.toggleEdgeSelection('quote"edge')
    expect([...useCanvasInteractionStore.getState().selectedEdgeIds]).toEqual(['other'])
    state.toggleSelection('node')
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    state.replaceEdgeSelection(['other'])
    state.replaceSelection(['node'])
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    state.replaceEdgeSelection(['other'])
    state.clearSelection()
    expect(useCanvasInteractionStore.getState().selectedNodeIds.size).toBe(0)
    expect(useCanvasInteractionStore.getState().selectedEdgeIds.size).toBe(0)
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(localStorage.length).toBe(0)
  })
  it('switches_tools_without_changing_the_snapshot', () => {
    const snapshot = useCanvasSessionStore.getState().snapshot
    useCanvasInteractionStore.getState().setTool('pan')
    expect(useCanvasInteractionStore.getState().tool).toBe('pan')
    useCanvasInteractionStore.getState().setTool('select')
    expect(useCanvasInteractionStore.getState().tool).toBe('select')
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
  })

  it('replaces_the_shared_menu_and_releases_its_trigger_on_close', () => {
    const trigger = document.createElement('button')
    const canvas = document.createElement('section')
    const state = useCanvasInteractionStore.getState()
    state.openCreateMenu({ x: 80, y: 300 }, { x: 640, y: 400 }, trigger)
    expect(useCanvasInteractionStore.getState().createMenu).toEqual({ anchor: { x: 80, y: 300 }, flowPosition: { x: 640, y: 400 }, trigger })
    state.openCreateMenu({ x: 310, y: 210 }, { x: -20, y: 40 }, canvas)
    expect(useCanvasInteractionStore.getState().createMenu).toEqual({ anchor: { x: 310, y: 210 }, flowPosition: { x: -20, y: 40 }, trigger: canvas })
    state.closeCreateMenu()
    expect(useCanvasInteractionStore.getState().createMenu).toBeNull()
  })

  it('owns_selection_ids_without_reusing_the_callers_collection', () => {
    const ids = ['old', 'other']
    const state = useCanvasInteractionStore.getState()
    state.replaceSelection(ids)
    ids.push('late')
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['old', 'other'])
    state.replaceSelection(['created'])
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['created'])
    state.toggleSelection('other')
    state.toggleSelection('created')
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['other'])
    state.clearSelection()
    expect(useCanvasInteractionStore.getState().selectedNodeIds.size).toBe(0)
  })

  it('does_not_save_tools_menu_dom_references_or_selection', () => {
    const snapshot = useCanvasSessionStore.getState().snapshot
    const state = useCanvasInteractionStore.getState()
    state.setTool('pan')
    state.openCreateMenu({ x: 1, y: 2 }, { x: 3, y: 4 }, document.createElement('button'))
    state.replaceSelection(['selected'])
    state.replaceEdgeSelection(['selected-edge'])
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(localStorage.length).toBe(0)
    renameCanvas('保存领域数据')
    const stored = JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!)
    expect(stored).toEqual(useCanvasSessionStore.getState().snapshot)
    expect(JSON.stringify(stored)).not.toMatch(/createMenu|selectedNodeIds|selectedEdgeIds|flowPosition|"tool"/)
  })
})
