import type { EditorMode, MediaEditorDraft, MediaEditorDraftState } from '../../domain/canvas/types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
const stateOf = (draft: MediaEditorDraft): MediaEditorDraftState => ({ inPoint: draft.inPoint, outPoint: draft.outPoint, crop: structuredClone(draft.crop), clipNodeIds: [...draft.clipNodeIds] })

export function createEditorDraft(mode: EditorMode, source: { id: string; durationSeconds: number }, selection: string[]): MediaEditorDraft {
  return { sourceNodeId: source.id, mode, durationSeconds: Math.max(.1, source.durationSeconds), inPoint: 0, outPoint: Math.max(.1, source.durationSeconds),
    crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: 'free', showSafeArea: false }, clipNodeIds: [...selection],
    undoStack: [], redoStack: [], dirty: false, updatedAt: new Date().toISOString() }
}

export function applyEditorEdit(draft: MediaEditorDraft, edit: Partial<MediaEditorDraftState>): MediaEditorDraft {
  let inPoint = edit.inPoint ?? draft.inPoint, outPoint = edit.outPoint ?? draft.outPoint
  if (!Number.isFinite(inPoint) || !Number.isFinite(outPoint) || inPoint < 0 || outPoint > draft.durationSeconds || inPoint >= outPoint) {
    inPoint = 0; outPoint = draft.durationSeconds
  }
  const rawCrop = edit.crop ?? draft.crop
  const width = clamp(rawCrop.width, .01, 1), height = clamp(rawCrop.height, .01, 1)
  const crop = { ...rawCrop, width, height, x: Number(clamp(rawCrop.x, 0, 1 - width).toFixed(6)), y: Number(clamp(rawCrop.y, 0, 1 - height).toFixed(6)) }
  return { ...draft, inPoint, outPoint, crop, clipNodeIds: edit.clipNodeIds ? [...edit.clipNodeIds] : [...draft.clipNodeIds],
    undoStack: [...draft.undoStack, stateOf(draft)].slice(-50), redoStack: [], dirty: true, updatedAt: new Date().toISOString() }
}

export function undoEditorEdit(draft: MediaEditorDraft): MediaEditorDraft {
  const previous = draft.undoStack.at(-1)
  if (!previous) return draft
  return { ...draft, ...structuredClone(previous), undoStack: draft.undoStack.slice(0, -1), redoStack: [...draft.redoStack, stateOf(draft)], updatedAt: new Date().toISOString() }
}

export function redoEditorEdit(draft: MediaEditorDraft): MediaEditorDraft {
  const next = draft.redoStack.at(-1)
  if (!next) return draft
  return { ...draft, ...structuredClone(next), undoStack: [...draft.undoStack, stateOf(draft)], redoStack: draft.redoStack.slice(0, -1), updatedAt: new Date().toISOString() }
}
