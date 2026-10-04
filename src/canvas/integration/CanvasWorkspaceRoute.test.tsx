import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../domain/canvas/migrateSnapshot'
import { saveCanvasSnapshot } from '../features/persistence/canvasSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../stores/useCanvasSessionStore'
import { CanvasLanding } from './CanvasLanding'
import { CanvasWorkspaceRoute } from './CanvasWorkspaceRoute'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
})

describe('canvas route integration', () => {
  it('offers exactly the Original and ShuLan entries', () => {
    render(<CanvasLanding />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: /保留当前外观/ })).toHaveAttribute('href', '#/canvas/original')
    expect(screen.getByRole('link', { name: /ShuLan 设计语言/ })).toHaveAttribute('href', '#/canvas/shulan')
  })

  it('switches theme without replacing nodes, edges, or viewport', async () => {
    const snapshot = createEmptySnapshot('shared-canvas', now)
    snapshot.nodesById.seed = {
      id: 'seed', type: 'text', role: 'blank', name: '共享节点', position: { x: 24, y: 36 }, locked: false,
      display: { width: 320, height: 260 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
      taskId: null, createdAt: now, updatedAt: now,
    }
    snapshot.nodesById.target = { ...snapshot.nodesById.seed, id: 'target', name: '目标节点', position: { x: 420, y: 36 } }
    snapshot.nodeOrder = ['seed', 'target']
    snapshot.edgesById.shared = { id: 'shared', sourceNodeId: 'seed', targetNodeId: 'target', relationType: 'reference', sourceVersionId: null }
    snapshot.edgeOrder = ['shared']
    snapshot.viewport = { x: 18, y: 27, zoom: 0.8 }
    saveCanvasSnapshot(localStorage, snapshot)

    function Harness() {
      const current = window.location.hash.endsWith('/shulan') ? 'shulan' : 'original'
      return <CanvasWorkspaceRoute theme={current} onThemeChange={(theme) => {
        window.location.hash = `/canvas/${theme}`
      }} />
    }

    window.location.hash = '/canvas/original'
    const view = render(<Harness />)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '原始外观' })).toHaveAttribute('aria-pressed', 'true')
    const before = useCanvasSessionStore.getState().snapshot
    expect(before.nodeOrder).toEqual(['seed', 'target'])
    expect(before.edgeOrder).toEqual(['shared'])
    await userEvent.click(screen.getByRole('button', { name: 'ShuLan 设计' }))
    view.rerender(<Harness />)
    const after = useCanvasSessionStore.getState().snapshot

    expect(screen.getByTestId('canvas-theme-root')).toHaveAttribute('data-canvas-theme', 'shulan')
    expect(screen.getByRole('button', { name: 'ShuLan 设计' })).toHaveAttribute('aria-pressed', 'true')
    expect(after.nodeOrder).toEqual(before.nodeOrder)
    expect(after.edgeOrder).toEqual(before.edgeOrder)
    expect(after.viewport).toEqual(before.viewport)
  })
})
