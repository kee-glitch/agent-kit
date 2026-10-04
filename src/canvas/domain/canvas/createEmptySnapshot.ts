import type { CanvasSnapshot } from './types'

export const CURRENT_SCHEMA_VERSION = 4

export function createEmptySnapshot(canvasId: string, now: string): CanvasSnapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    canvas: {
      id: canvasId,
      name: '未命名画布',
      createdAt: now,
      updatedAt: now,
    },
    nodesById: {},
    nodeOrder: [],
    edgesById: {},
    edgeOrder: [],
    versionsById: {},
    versionOrder: [],
    groupsById: {},
    groupOrder: [],
    tasksById: {},
    editorDraftsBySourceId: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}
