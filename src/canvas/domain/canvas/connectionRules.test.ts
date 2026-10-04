import { describe, expect, it } from 'vitest'
import { validateConnection } from './connectionRules'
import { createEmptySnapshot } from './createEmptySnapshot'
import type { ContentType, RelationType } from './types'

const now = '2026-10-04T00:00:00.000Z'
function graph(type: ContentType = 'text') {
  const snapshot = createEmptySnapshot('rules', now)
  for (const id of ['a', 'b']) snapshot.nodesById[id] = {
    id, type: id === 'a' ? type : 'audio', role: 'blank', name: id, position: { x: 0, y: 0 },
    locked: false, display: { width: 280, height: 180 }, versionIds: [], currentVersionId: null,
    taskId: null, createdAt: now, updatedAt: now,
  }
  snapshot.nodeOrder = ['a', 'b']
  return snapshot
}

describe('shared connection rules', () => {
  it.each([['missing', 'b'], ['a', 'missing'], ['constructor', 'b'], ['a', 'a']])('rejects_invalid_endpoints_%s_%s', (source, target) => {
    const snapshot = graph()
    expect(validateConnection(snapshot, source, target, 'reference')).toEqual({ ok: false, reason: expect.any(String) })
  })
  it.each(['a', 'b'])('rejects_locked_endpoint_%s', (id) => {
    const snapshot = graph()
    snapshot.nodesById[id].locked = true
    expect(validateConnection(snapshot, 'a', 'b', 'derived')).toEqual({ ok: false, reason: expect.stringContaining('锁定') })
  })
  it.each<ContentType>(['text', 'image', 'video', 'audio'])('permits_reference_and_derived_from_%s_and_instruction_only_from_text', (type) => {
    const snapshot = graph(type)
    const before = JSON.stringify(snapshot)
    expect(validateConnection(snapshot, 'a', 'b', 'reference')).toEqual({ ok: true })
    expect(validateConnection(snapshot, 'a', 'b', 'derived')).toEqual({ ok: true })
    expect(validateConnection(snapshot, 'a', 'b', 'instruction').ok).toBe(type === 'text')
    expect(JSON.stringify(snapshot)).toBe(before)
  })
  it.each<RelationType>(['instruction', 'reference', 'derived'])('rejects_duplicate_%s_but_allows_other_types_and_reverse_direction', (relationType) => {
    const snapshot = graph()
    snapshot.edgesById.old = { id: 'old', sourceNodeId: 'a', targetNodeId: 'b', relationType, sourceVersionId: null }
    snapshot.edgeOrder = ['old']
    expect(validateConnection(snapshot, 'a', 'b', relationType)).toEqual({ ok: false, reason: expect.stringContaining('已存在') })
    expect(validateConnection(snapshot, 'b', 'a', 'reference')).toEqual({ ok: true })
  })
})
