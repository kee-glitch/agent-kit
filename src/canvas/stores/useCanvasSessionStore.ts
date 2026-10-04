import { create } from 'zustand'
import { applyCanvasCommand, type CanvasCommand } from '../domain/canvas/canvasCommands'
import { createEmptySnapshot } from '../domain/canvas/createEmptySnapshot'
import type { CanvasSnapshot, CanvasViewport } from '../domain/canvas/types'
import { loadCanvasSnapshot, saveCanvasSnapshot } from '../features/persistence/canvasSnapshot'
import { useLocalMediaStore } from './useLocalMediaStore'

interface CanvasSessionState {
  snapshot: CanvasSnapshot
  saveStatus: 'saved' | 'saving' | 'failed'
  recoveryNotice: null | string
  canUndo: boolean
  canRedo: boolean
  executeCommand: typeof executeCommand
  undo: typeof undo
  redo: typeof redo
}

// A handle is retained only after the primary value was accepted or preserved.
let writableStorage: Storage | null = null

const structuralKeys = ['nodesById', 'nodeOrder', 'edgesById', 'edgeOrder', 'versionsById', 'versionOrder', 'groupsById', 'groupOrder', 'tasksById', 'editorDraftsBySourceId'] as const
type HistoryPatch = Partial<Pick<CanvasSnapshot, typeof structuralKeys[number]>> & { updatedAt: string }
interface HistoryEntry { before: HistoryPatch; after: HistoryPatch }
const undoStack: HistoryEntry[] = []
const redoStack: HistoryEntry[] = []

export const useCanvasSessionStore = create<CanvasSessionState>(() => ({
  snapshot: createEmptySnapshot('local-canvas', new Date().toISOString()),
  saveStatus: 'saving',
  recoveryNotice: null,
  canUndo: false,
  canRedo: false,
  executeCommand,
  undo,
  redo,
}))

function persistSession(): void {
  useCanvasSessionStore.setState({ saveStatus: 'saving' })
  try {
    if (!writableStorage) throw new Error('Local storage is not safe to overwrite')
    saveCanvasSnapshot(writableStorage, useCanvasSessionStore.getState().snapshot)
    markSaved()
  } catch {
    useCanvasSessionStore.setState({ saveStatus: 'failed' })
  }
}

export function hydrateCanvasSession(storage: Storage | null, now: string): void {
  useLocalMediaStore.getState().reset()
  writableStorage = null
  undoStack.length = 0
  redoStack.length = 0
  const fallback = createEmptySnapshot('local-canvas', now)
  const result = storage
    ? loadCanvasSnapshot(storage, fallback)
    : { status: 'loaded', snapshot: fallback, hadStoredValue: false, canPersist: false }
  writableStorage = result.canPersist ? storage : null
  useCanvasSessionStore.setState({
    snapshot: result.snapshot,
    // Safe write eligibility is separate from confirming a durable snapshot.
    saveStatus: result.status === 'loaded' && result.hadStoredValue ? 'saved' : 'failed',
    recoveryNotice: result.status === 'recovered' ? '本地画布已安全恢复' : null,
    canUndo: false,
    canRedo: false,
  })
}

export function renameCanvas(name: string): void {
  const { snapshot } = useCanvasSessionStore.getState()
  useCanvasSessionStore.setState({
    snapshot: {
      ...snapshot,
      canvas: { ...snapshot.canvas, name: name.trim() || '未命名画布', updatedAt: new Date().toISOString() },
    },
  })
  persistSession()
}

export function updateViewport(viewport: CanvasViewport): void {
  const { snapshot } = useCanvasSessionStore.getState()
  useCanvasSessionStore.setState({ snapshot: { ...snapshot, viewport: { ...viewport } } })
  persistSession()
}

export function markSaved(): void {
  useCanvasSessionStore.setState({ saveStatus: writableStorage ? 'saved' : 'failed' })
}

export function executeCommand(command: CanvasCommand): boolean {
  const { snapshot } = useCanvasSessionStore.getState()
  const next = applyCanvasCommand(snapshot, command)
  if (next === snapshot) return false
  for (const id of snapshot.nodeOrder) if (!Object.hasOwn(next.nodesById, id)) useLocalMediaStore.getState().remove(id)
  const before: HistoryPatch = { updatedAt: snapshot.canvas.updatedAt }
  const after: HistoryPatch = { updatedAt: next.canvas.updatedAt }
  for (const key of structuralKeys) {
    if (snapshot[key] === next[key]) continue
    Object.assign(before, { [key]: snapshot[key] })
    Object.assign(after, { [key]: next[key] })
  }
  const recordsHistory = command.type !== 'submit-generation' && command.type !== 'submit-media-operation'
  if (recordsHistory) {
    undoStack.push({ before, after })
    if (undoStack.length > 50) undoStack.shift()
    redoStack.length = 0
  }
  useCanvasSessionStore.setState({ snapshot: next, canUndo: undoStack.length > 0, canRedo: recordsHistory ? false : redoStack.length > 0 })
  persistSession()
  return true
}

export function commitTaskSnapshot(snapshot: CanvasSnapshot): void {
  useCanvasSessionStore.setState({ snapshot })
  persistSession()
}

function restoreHistory(patch: HistoryPatch): void {
  const { snapshot } = useCanvasSessionStore.getState()
  const { updatedAt, ...structure } = patch
  const restored = { ...snapshot, ...structure }
  // Task events are external facts, not user history. Preserve any later
  // terminal task/version data when replaying an older structural patch.
  for (const task of Object.values(snapshot.tasksById)) {
    if (!['completed', 'failed', 'cancelled', 'source-missing', 'interrupted'].includes(task.status)) continue
    const resultId = task.resultNodeId
    if (!resultId || !restored.nodesById[resultId] || !restored.tasksById[task.id]) continue
    restored.tasksById = { ...restored.tasksById, [task.id]: task }
    const currentNode = snapshot.nodesById[resultId]
    restored.nodesById = { ...restored.nodesById, [resultId]: { ...restored.nodesById[resultId],
      versionIds: [...currentNode.versionIds], currentVersionId: currentNode.currentVersionId, updatedAt: currentNode.updatedAt } }
    for (const versionId of currentNode.versionIds) if (snapshot.versionsById[versionId]) {
      restored.versionsById = { ...restored.versionsById, [versionId]: snapshot.versionsById[versionId] }
      if (!restored.versionOrder.includes(versionId)) restored.versionOrder = [...restored.versionOrder, versionId]
    }
  }
  useCanvasSessionStore.setState({
    snapshot: { ...restored, canvas: { ...snapshot.canvas, updatedAt } },
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  })
  persistSession()
}

export function undo(): boolean {
  const entry = undoStack.pop()
  if (!entry) return false
  redoStack.push(entry)
  if (redoStack.length > 50) redoStack.shift()
  restoreHistory(entry.before)
  return true
}

export function redo(): boolean {
  const entry = redoStack.pop()
  if (!entry) return false
  undoStack.push(entry)
  if (undoStack.length > 50) undoStack.shift()
  restoreHistory(entry.after)
  return true
}
export function selectCanUndo(state: CanvasSessionState): boolean { return state.canUndo }
export function selectCanRedo(state: CanvasSessionState): boolean { return state.canRedo }
