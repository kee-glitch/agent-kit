import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../persistence/canvasSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { useCanvasKeyboard } from './useCanvasKeyboard'

const now = '2026-10-04T00:00:00.000Z'
function Harness({ onDelete = vi.fn(), enabled = true }: { onDelete?: (trigger: HTMLElement) => void; enabled?: boolean }) {
  useCanvasKeyboard({ onDeleteRequest: onDelete, enabled })
  return <><section tabIndex={-1} aria-label="canvas" /><input aria-label="input" /><textarea aria-label="textarea" /><select aria-label="select"><option>one</option></select><div contentEditable suppressContentEditableWarning aria-label="editor"><span>child</span></div></>
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  const snapshot = createEmptySnapshot('keys', now)
  for (const [id, type, content] of [['a', 'text', 'literal text'], ['b', 'image', 'blob:temporary'], ['other', 'text', 'unselected']] as const) {
    snapshot.nodesById[id] = { id, type, role: 'generated', name: id, position: { x: 10, y: 20 }, display: { width: 280, height: 180 }, locked: false,
      versionIds: [`v-${id}`], currentVersionId: `v-${id}`, taskId: null, createdAt: now, updatedAt: now }
    snapshot.nodeOrder.push(id)
    snapshot.versionsById[`v-${id}`] = { id: `v-${id}`, nodeId: id, content: type === 'image' ? null : content, createdAt: now }
    snapshot.versionOrder.push(`v-${id}`)
  }
  saveCanvasSnapshot(localStorage, snapshot)
  hydrateCanvasSession(localStorage, now)
  const current = useCanvasSessionStore.getState().snapshot
  Object.assign(current.nodesById.a, { taskId: 'task', runState: 'processing', objectUrl: 'blob:secret' })
  Object.assign(current.versionsById['v-b'], { content: 'blob:temporary', objectUrl: 'blob:extra' })
  current.tasksById.task = { id: 'task', nodeId: 'a', status: 'processing', createdAt: now, updatedAt: now }
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set(['a', 'b']), selectedEdgeIds: new Set() })
})

describe('useCanvasKeyboard', () => {
  it.each(['input', 'textarea', 'select', 'editor'])('protects_selected_edges_from_delete_and_history_inside_%s', (name) => {
    const request = vi.fn()
    useCanvasInteractionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(['edge']) })
    render(<Harness onDelete={request} />)
    const target = name === 'editor' ? screen.getByText('child') : screen.getByLabelText(name)
    const before = useCanvasSessionStore.getState().snapshot
    fireEvent.keyDown(target, { key: 'Delete' })
    fireEvent.keyDown(target, { key: 'Backspace' })
    fireEvent.keyDown(target, { key: 'z', ctrlKey: true })
    expect(request).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(before)
    fireEvent.keyDown(screen.getByRole('region'), { key: 'Delete' })
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('whitelists_nested_geometry_after_a_successful_save_and_hydration_before_copy', async () => {
    const snapshot = useCanvasSessionStore.getState().snapshot
    Object.assign(snapshot.nodesById.a.position, { objectUrl: 'blob:secret', runState: 'pending', unexpectedPosition: 'position-only' })
    Object.assign(snapshot.nodesById.a.display, { objectUrl: 'blob:size-secret', runState: 'processing', unexpectedDisplay: 'display-only' })
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    expect(useCanvasSessionStore.getState().recoveryNotice).toBeNull()
    const hydrated = useCanvasSessionStore.getState().snapshot
    expect(hydrated.nodesById.a.position).toMatchObject({ x: 10, y: 20, objectUrl: 'blob:secret' })
    expect(hydrated.nodesById.a.display).toMatchObject({ width: 280, height: 180, runState: 'processing' })
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<Harness />)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.keyDown(screen.getByRole('region'), { key: 'c', ctrlKey: true })
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = JSON.parse(writeText.mock.calls[0][0])
    expect(copied.nodes).toHaveLength(1)
    expect(copied.nodes[0].position).toEqual({ x: 10, y: 20 })
    expect(copied.nodes[0].display).toEqual({ width: 280, height: 180 })
    expect(writeText.mock.calls[0][0]).not.toMatch(/objectUrl|runState|unexpectedPosition|unexpectedDisplay|blob:|pending|processing/)
    expect(writes).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(hydrated)
  })

  it.each(['Delete', 'Backspace'])('requests_confirmation_for_%s_without_mutating', (key) => {
    const request = vi.fn()
    render(<Harness onDelete={request} />)
    const target = screen.getByRole('region')
    target.focus()
    const snapshot = useCanvasSessionStore.getState().snapshot
    fireEvent.keyDown(target, { key })
    expect(request).toHaveBeenCalledWith(target)
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
  })

  it('copies_only_persistable_selected_nodes_without_creating_nodes_or_saving', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<Harness />)
    const snapshot = useCanvasSessionStore.getState().snapshot
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.keyDown(screen.getByRole('region'), { key: 'c', ctrlKey: true })
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = JSON.parse(writeText.mock.calls[0][0])
    expect(copied.schemaVersion).toBe(3)
    expect(copied.nodes.map((node: { id: string }) => node.id)).toEqual(['a', 'b'])
    expect(copied.nodes[0].versions[0].content).toBe('literal text')
    expect(copied.nodes[1].versions[0].content).toBeNull()
    expect(copied.nodes[0].input).toEqual(useCanvasSessionStore.getState().snapshot.nodesById.a.input)
    expect(writeText.mock.calls[0][0]).not.toMatch(/taskId|runState|objectUrl|blob:|processing|unselected/)
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(writes).not.toHaveBeenCalled()
  })

  it.each(['ctrlKey', 'metaKey'] as const)('duplicates_as_one_command_with_fresh_ids_and_history_using_%s', (modifier) => {
    const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'] as const
    const uuid = vi.spyOn(crypto, 'randomUUID')
    for (const id of ids) uuid.mockReturnValueOnce(id)
    render(<Harness />)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const target = screen.getByRole('region')
    fireEvent.keyDown(target, { key: 'd', [modifier]: true })
    const snapshot = useCanvasSessionStore.getState().snapshot
    expect(snapshot.nodeOrder).toHaveLength(5)
    const copies = snapshot.nodeOrder.slice(3).map((id) => snapshot.nodesById[id])
    expect(copies.map((node) => node.position)).toEqual([{ x: 42, y: 52 }, { x: 42, y: 52 }])
    expect(copies.every((node) => node.taskId === null && node.createdAt !== now && node.createdAt === node.updatedAt)).toBe(true)
    expect(copies[0].currentVersionId).not.toBe('v-a')
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(copies.map((node) => node.id))
    expect(writes).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(target, { key: 'z', [modifier]: true })
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(['a', 'b', 'other'])
    expect(useCanvasSessionStore.getState().canUndo).toBe(false)
    fireEvent.keyDown(target, { key: 'z', [modifier]: true, shiftKey: true })
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(snapshot.nodeOrder)
    fireEvent.keyDown(target, { key: 'z', [modifier]: true })
    fireEvent.keyDown(target, { key: 'y', [modifier]: true })
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual(snapshot.nodeOrder)
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).nodeOrder).toEqual(snapshot.nodeOrder)
  })

  it.each(['input', 'textarea', 'select', 'editor'])('protects_%s_and_contenteditable_descendants_from_all_canvas_shortcuts', (name) => {
    const request = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    useCanvasSessionStore.getState().executeCommand({ type: 'move-nodes', positions: { a: { x: 30, y: 40 } }, now: '2026-10-04T00:01:00.000Z' })
    render(<Harness onDelete={request} />)
    const target = name === 'editor' ? screen.getByText('child') : screen.getByLabelText(name)
    const snapshot = useCanvasSessionStore.getState().snapshot
    for (const key of ['Delete', 'Backspace', 'c', 'd', 'z', 'y']) fireEvent.keyDown(target, { key, ctrlKey: !['Delete', 'Backspace'].includes(key) })
    expect(request).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(useCanvasSessionStore.getState().canUndo).toBe(true)
    expect(useCanvasSessionStore.getState().canRedo).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('announces_copy_success_only_after_the_clipboard_accepts_and_reports_failure', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<Harness />)
    const target = screen.getByRole('region')
    fireEvent.keyDown(target, { key: 'c', metaKey: true })
    await waitFor(() => expect(useCanvasInteractionStore.getState().announcement.message).toContain('无法写入剪贴板'))
    expect(useCanvasInteractionStore.getState().announcement.message).not.toContain('已复制')
    writeText.mockResolvedValue(undefined)
    fireEvent.keyDown(target, { key: 'c', metaKey: true })
    await waitFor(() => expect(useCanvasInteractionStore.getState().announcement.message).toContain('已复制 2 个节点'))
  })

  it('does_not_open_delete_for_only_locked_nodes_or_announce_rejected_duplicates', () => {
    useCanvasSessionStore.getState().snapshot.nodesById.a.locked = true
    useCanvasInteractionStore.getState().replaceSelection(['a'])
    // Force a collision with a valid existing domain ID, including legacy short IDs.
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('a' as ReturnType<typeof crypto.randomUUID>)
    const request = vi.fn()
    render(<Harness onDelete={request} />)
    const snapshot = useCanvasSessionStore.getState().snapshot
    const announcement = useCanvasInteractionStore.getState().announcement
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.keyDown(screen.getByRole('region'), { key: 'Delete' })
    fireEvent.keyDown(screen.getByRole('region'), { key: 'd', ctrlKey: true })
    expect(request).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    expect(useCanvasInteractionStore.getState().announcement).toBe(announcement)
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual(['a'])
    expect(writes).not.toHaveBeenCalled()
  })

  it('ignores_unowned_modifiers_disabled_state_and_no_op_history', () => {
    const request = vi.fn()
    const view = render(<Harness onDelete={request} />)
    const target = screen.getByRole('region')
    const snapshot = useCanvasSessionStore.getState().snapshot
    for (const event of [{ key: 'Delete', shiftKey: true }, { key: 'Backspace', ctrlKey: true }, { key: 'd', ctrlKey: true, altKey: true }, { key: 'c', ctrlKey: true, shiftKey: true }, { key: 'y', ctrlKey: true, shiftKey: true }, { key: 'z', ctrlKey: true, metaKey: true }, { key: 'z', ctrlKey: true }]) fireEvent.keyDown(target, event)
    expect(request).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
    view.rerender(<Harness onDelete={request} enabled={false} />)
    fireEvent.keyDown(target, { key: 'd', ctrlKey: true })
    expect(useCanvasSessionStore.getState().snapshot).toBe(snapshot)
  })
})
