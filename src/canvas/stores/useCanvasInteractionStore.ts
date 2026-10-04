import { create } from 'zustand'
import type { EditorMode } from '../domain/canvas/types'

export type CanvasTool = 'select' | 'pan'
type Position = { x: number; y: number }
export interface CreateMenuState { anchor: Position; flowPosition: Position; trigger: HTMLElement; sourceNodeId?: string }
interface CanvasInteractionState {
  tool: CanvasTool
  createMenu: CreateMenuState | null
  nodePreviewPositions: ReadonlyMap<string, Position>
  selectedNodeIds: ReadonlySet<string>
  selectedEdgeIds: ReadonlySet<string>
  announcement: { count: number; message: string }
  editorRequest: { sourceNodeId: string; mode: EditorMode } | null
  announce: (message: string) => void
  setTool: (tool: CanvasTool) => void
  openCreateMenu: (anchor: Position, flowPosition: Position, trigger: HTMLElement, sourceNodeId?: string) => void
  closeCreateMenu: () => void
  previewNodePosition: (nodeId: string, position: Position) => void
  clearNodePreviewPosition: (nodeId: string) => void
  replaceSelection: (ids: string[]) => void
  toggleSelection: (id: string) => void
  replaceEdgeSelection: (ids: string[]) => void
  toggleEdgeSelection: (id: string) => void
  clearSelection: () => void
  openEditor: (sourceNodeId: string, mode: EditorMode) => void
  closeEditor: () => void
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  tool: 'select', createMenu: null, nodePreviewPositions: new Map(), selectedNodeIds: new Set(), selectedEdgeIds: new Set(), editorRequest: null,
  announcement: { count: 0, message: '' },
  announce: (message) => set((state) => ({ announcement: { count: state.announcement.count + 1, message } })),
  setTool: (tool) => set({ tool }),
  openCreateMenu: (anchor, flowPosition, trigger, sourceNodeId) => set({ createMenu: { anchor: { ...anchor }, flowPosition: { ...flowPosition }, trigger, sourceNodeId } }),
  closeCreateMenu: () => set({ createMenu: null }),
  previewNodePosition: (nodeId, position) => set((state) => ({ nodePreviewPositions: new Map(state.nodePreviewPositions).set(nodeId, { ...position }) })),
  clearNodePreviewPosition: (nodeId) => set((state) => {
    const nodePreviewPositions = new Map(state.nodePreviewPositions)
    nodePreviewPositions.delete(nodeId)
    return { nodePreviewPositions }
  }),
  replaceSelection: (ids) => set({ selectedNodeIds: new Set(ids), selectedEdgeIds: new Set() }),
  toggleSelection: (id) => set((state) => {
    const selectedNodeIds = new Set(state.selectedNodeIds)
    if (selectedNodeIds.has(id)) selectedNodeIds.delete(id)
    else selectedNodeIds.add(id)
    return { selectedNodeIds, selectedEdgeIds: new Set() }
  }),
  replaceEdgeSelection: (ids) => set({ selectedEdgeIds: new Set(ids), selectedNodeIds: new Set() }),
  toggleEdgeSelection: (id) => set((state) => {
    const selectedEdgeIds = new Set(state.selectedEdgeIds)
    if (selectedEdgeIds.has(id)) selectedEdgeIds.delete(id)
    else selectedEdgeIds.add(id)
    return { selectedEdgeIds, selectedNodeIds: new Set() }
  }),
  clearSelection: () => set({ selectedNodeIds: new Set(), selectedEdgeIds: new Set() }),
  openEditor: (sourceNodeId, mode) => set({ editorRequest: { sourceNodeId, mode } }),
  closeEditor: () => set({ editorRequest: null }),
}))
