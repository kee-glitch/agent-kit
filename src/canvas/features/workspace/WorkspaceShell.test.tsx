import { act, render as renderUI, screen, within } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import type { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasApp } from '../../app/CanvasApp'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { CANVAS_STORAGE_KEY, saveCanvasSnapshot } from '../persistence/canvasSnapshot'
import { hydrateCanvasSession, markSaved, renameCanvas, updateViewport, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { WorkspaceShell } from './WorkspaceShell'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import '../../styles/shulan-theme.css'

function render(ui: ReactElement) { return renderUI(<ReactFlowProvider>{ui}</ReactFlowProvider>) }

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set() })
})

describe('WorkspaceShell', () => {
  it('uses_the_shared_workspace_tree_under_the_shulan_theme_contract', () => {
    render(<CanvasApp theme="shulan" />)
    const root = screen.getByTestId('canvas-theme-root')
    expect(root).toHaveAttribute('data-canvas-theme', 'shulan')
    expect(getComputedStyle(root).getPropertyValue('--surface').trim()).toBe('var(--color-bg-surface)')
    expect(screen.getByRole('toolbar', { name: '创作工具' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加节点' })).toBeVisible()
  })

  it('renders_only_the_approved_top_controls', () => {
    render(<WorkspaceShell />)
    expect(screen.getByRole('button', { name: '项目菜单' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: '画布名称' })).toBeVisible()
    expect(screen.getByRole('status', { name: '本地保存状态' })).toHaveTextContent('本地保存未确认')
    expect(screen.getByRole('button', { name: '分享' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '分享' })).toHaveAccessibleDescription('本地画布暂不支持分享')
    expect(screen.queryByText(/对话|积分|充值|付费|登录/)).not.toBeInTheDocument()
  })

  it('shows_the_verified_left_tool_order', () => {
    render(<WorkspaceShell />)
    const tools = within(screen.getByRole('toolbar', { name: '创作工具' })).getAllByRole('button')
    expect(tools.map((button) => button.getAttribute('aria-label'))).toEqual([
      '添加节点', '鼠标选择', '抓手', '剪辑', '模板', '历史', '帮助',
    ])
  })

  it('keeps_phase_five_tools_disabled_and_opens_clip_in_phase_four', () => {
    render(<WorkspaceShell />)
    expect(screen.getByRole('button', { name: '剪辑' })).toBeEnabled()
    for (const name of ['模板', '历史', '帮助']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
      expect(screen.getByRole('button', { name })).toHaveAccessibleDescription('后续阶段开放')
    }
  })

  it.each(['项目菜单'])('marks_the_unimplemented_%s_control_as_disabled', (name) => {
    render(<WorkspaceShell />)
    expect(screen.getByRole('button', { name })).toBeDisabled()
    expect(screen.getByRole('button', { name })).toHaveAccessibleDescription('后续阶段开放')
  })

  it('enables_creation_and_exposes_the_active_tool_with_pressed_state', async () => {
    const user = userEvent.setup()
    render(<WorkspaceShell />)
    expect(screen.getByRole('button', { name: '添加节点' })).toBeEnabled()
    const select = screen.getByRole('button', { name: '鼠标选择' })
    const pan = screen.getByRole('button', { name: '抓手' })
    expect(select).toBeEnabled()
    expect(select).toHaveAttribute('aria-pressed', 'true')
    expect(select).toHaveAttribute('title', '鼠标选择（当前工具）')
    await user.click(pan)
    expect(pan).toHaveAttribute('aria-pressed', 'true')
    expect(select).toHaveAttribute('aria-pressed', 'false')
    expect(useCanvasInteractionStore.getState().tool).toBe('pan')
    await user.click(select)
    expect(select).toHaveAttribute('aria-pressed', 'true')
  })

  it('rejects_opening_the_video_editor_for_a_non_video_selection', async () => {
    const user = userEvent.setup()
    const snapshot = createEmptySnapshot('canvas', now)
    snapshot.nodesById.image = { id: 'image', type: 'image', role: 'blank', name: '图片', position: { x: 0, y: 0 }, locked: false,
      display: { width: 320, height: 260 }, versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now }
    snapshot.nodeOrder = ['image']
    useCanvasSessionStore.setState({ snapshot })
    useCanvasInteractionStore.getState().replaceSelection(['image'])
    render(<WorkspaceShell />)
    await user.click(screen.getByRole('button', { name: '剪辑' }))
    expect(useCanvasInteractionStore.getState().editorRequest).toBeNull()
    expect(useCanvasInteractionStore.getState().announcement.message).toBe('请先选择一个视频节点')
  })

  it.each(['', '   '])('normalizes_an_empty_or_whitespace_canvas_name_on_blur (%j)', async (name) => {
    const user = userEvent.setup()
    render(<WorkspaceShell />)
    const title = screen.getByRole('textbox', { name: '画布名称' })
    await user.clear(title)
    if (name) await user.type(title, name)
    await user.tab()
    expect(title).toHaveValue('未命名画布')
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).canvas.name).toBe('未命名画布')
  })

  it('shows_one_recovery_banner_after_corrupt_snapshot_hydration', () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, '{broken')
    hydrateCanvasSession(localStorage, now)
    render(<WorkspaceShell />)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent('本地画布已安全恢复')
    expect(screen.getByRole('status', { name: '本地保存状态' })).toHaveTextContent('本地保存未确认')
  })

  it('keeps_the_recovery_notice_during_strict_mode_startup', () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, '{broken')
    render(<StrictMode><CanvasApp theme="original" /></StrictMode>)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent('本地画布已安全恢复')
  })

  it('does_not_overwrite_unreadable_storage_during_hydration_or_later_edits', () => {
    let stored = 'existing-unreadable-snapshot'
    const setItem = vi.fn((_key: string, value: string) => { stored = value })
    const unreadable = {
      getItem: () => { throw new DOMException('Blocked read', 'SecurityError') },
      setItem,
    } as unknown as Storage
    hydrateCanvasSession(unreadable, now)
    expect(setItem).not.toHaveBeenCalled()
    expect(stored).toBe('existing-unreadable-snapshot')
    expect(useCanvasSessionStore.getState().snapshot.canvas.name).toBe('未命名画布')
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')

    renameCanvas('内存标题')
    updateViewport({ x: 10, y: 20, zoom: 0.5 })
    expect(useCanvasSessionStore.getState().snapshot.canvas.name).toBe('内存标题')
    expect(useCanvasSessionStore.getState().snapshot.viewport).toEqual({ x: 10, y: 20, zoom: 0.5 })
    expect(stored).toBe('existing-unreadable-snapshot')
    expect(setItem).not.toHaveBeenCalled()
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
    markSaved()
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
  })

  it('keeps_an_absent_snapshot_in_memory_until_the_first_user_edit', () => {
    expect(localStorage.getItem(CANVAS_STORAGE_KEY)).toBeNull()
    expect(useCanvasSessionStore.getState().saveStatus).toBe('failed')
    renameCanvas('首次保存')
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).canvas.name).toBe('首次保存')
    expect(useCanvasSessionStore.getState().saveStatus).toBe('saved')
  })

  it('keeps_app_editable_when_acquiring_local_storage_throws', async () => {
    const storageGetter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked storage', 'SecurityError')
    })
    try {
      render(<CanvasApp theme="original" />)
      expect(screen.getByRole('main', { name: '无限画布工作台' })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: '本地保存状态' })).toHaveTextContent('本地保存未确认')
      const user = userEvent.setup()
      const title = screen.getByRole('textbox', { name: '画布名称' })
      await user.clear(title)
      await user.type(title, '仍能编辑')
      expect(title).toHaveValue('仍能编辑')
    } finally {
      storageGetter.mockRestore()
    }
  })

  it('invalidates_the_previous_storage_handle_when_remount_acquisition_fails', async () => {
    const storage = localStorage
    const snapshot = createEmptySnapshot('previous-session', now)
    snapshot.canvas.name = '原有画布'
    saveCanvasSnapshot(storage, snapshot)
    const original = storage.getItem(CANVAS_STORAGE_KEY)
    const previousApp = render(<CanvasApp theme="original" />)
    expect(screen.getByRole('textbox', { name: '画布名称' })).toHaveValue('原有画布')
    previousApp.unmount()

    const storageGetter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked storage', 'SecurityError')
    })
    try {
      render(<CanvasApp theme="original" />)
      const user = userEvent.setup()
      const title = screen.getByRole('textbox', { name: '画布名称' })
      await user.clear(title)
      await user.type(title, '重新挂载后编辑')
      await user.tab()
      expect(title).toHaveValue('重新挂载后编辑')
      expect(useCanvasSessionStore.getState().snapshot.canvas.name).toBe('重新挂载后编辑')
      expect(storage.getItem(CANVAS_STORAGE_KEY)).toBe(original)
      expect(screen.getByRole('status', { name: '本地保存状态' })).toHaveTextContent('本地保存未确认')
    } finally {
      storageGetter.mockRestore()
    }
  })

  it('keeps_project_context_before_canvas_view_controls_and_left_rail', () => {
    render(<WorkspaceShell viewControls={<button>视图控制</button>}><section aria-label="画布内容" /></WorkspaceShell>)
    const top = screen.getByRole('region', { name: '项目控制' })
    const canvas = screen.getByRole('region', { name: '画布内容' })
    const view = screen.getByRole('button', { name: '视图控制' })
    const rail = screen.getByRole('toolbar', { name: '创作工具' })
    expect(top.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(canvas.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(view.compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reflects_a_loaded_name_and_persists_a_trimmed_name', async () => {
    const snapshot = createEmptySnapshot('restored-canvas', now)
    snapshot.canvas.name = '已有画布'
    saveCanvasSnapshot(localStorage, snapshot)
    hydrateCanvasSession(localStorage, now)
    const user = userEvent.setup()
    render(<WorkspaceShell />)
    const title = screen.getByRole('textbox', { name: '画布名称' })
    expect(title).toHaveValue('已有画布')
    await user.clear(title)
    await user.type(title, '  新画布  ')
    await user.tab()
    expect(title).toHaveValue('新画布')
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).canvas.name).toBe('新画布')
  })

  it('persists_viewport_changes_and_exposes_saving_failures', () => {
    updateViewport({ x: 125, y: -45, zoom: 0.75 })
    expect(JSON.parse(localStorage.getItem(CANVAS_STORAGE_KEY)!).viewport).toEqual({ x: 125, y: -45, zoom: 0.75 })
    const unavailable = { getItem: () => null, setItem: () => { throw new Error('unavailable') } } as unknown as Storage
    hydrateCanvasSession(unavailable, now)
    render(<WorkspaceShell />)
    act(() => renameCanvas('仍可编辑'))
    expect(screen.getByRole('textbox', { name: '画布名称' })).toHaveValue('仍可编辑')
    expect(screen.getByRole('status', { name: '本地保存状态' })).toHaveTextContent('本地保存未确认')
    act(() => markSaved())
    expect(useCanvasSessionStore.getState().saveStatus).toBe('saved')
  })
})
