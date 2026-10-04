import type { MediaEditorDraft, MediaOperation } from '../../domain/canvas/types'
import { startProcessing } from '../processing/startProcessing'
const operations: Record<MediaEditorDraft['mode'], MediaOperation> = { clip: 'clip', crop: 'crop', splice: 'splice', segment: 'segment-select' }
export function exportMediaEditorDraft(sourceNodeId: string, draft: MediaEditorDraft, scenario: 'success' | 'failure') {
  return startProcessing(sourceNodeId, operations[draft.mode], '', scenario)
}
