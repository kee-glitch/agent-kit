import { act, fireEvent, render as renderComponent, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentType } from '../../domain/canvas/types'
import type { CanvasNodeData } from '../canvas/canvasAdapters'
import { CanvasNode } from './CanvasNode'
import { nodeTypes } from './nodeTypes'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'

function render(ui: ReactElement) {
  return renderComponent(ui, { wrapper: ReactFlowProvider })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  hydrateCanvasSession(localStorage, '2026-10-04T00:00:00.000Z')
  useCanvasInteractionStore.getState().clearSelection()
})

function nodeProps(contentType: ContentType, selected = false, expanded = false): NodeProps<Node<CanvasNodeData, 'canvasNode'>> {
  return {
    id: 'node', type: 'canvasNode', width: 320, height: 260, dragging: false, zIndex: 0,
    selectable: true, deletable: true, selected, draggable: true, isConnectable: true,
    positionAbsoluteX: -12.5, positionAbsoluteY: 48.25,
    data: { nodeId: 'node', contentType, role: 'blank', name: '我的节点', locked: false, expanded, status: '等待内容', disabledCopy: { content: '阶段三开放：内容与生成', assets: '阶段五开放：资产库', playback: '阶段四开放：媒体播放' } },
  }
}

describe('CanvasNode', () => {
  it('locks_unlocks_and_duplicates_through_existing_commands_and_announces_accepted_results', async () => {
    const now = '2026-10-04T00:00:00.000Z'
    useCanvasSessionStore.getState().executeCommand({ type: 'create-node', node: {
      id: 'node', type: 'text', role: 'blank', name: '我的节点', locked: false, position: { x: 20, y: 30 }, display: { width: 280, height: 180 },
      versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
    } })
    const user = userEvent.setup()
    const view = render(<CanvasNode {...nodeProps('text', true, true)} />)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    await user.click(screen.getByRole('button', { name: '锁定节点' }))
    expect(useCanvasSessionStore.getState().snapshot.nodesById.node.locked).toBe(true)
    expect(useCanvasInteractionStore.getState().announcement.message).toContain('已锁定')
    const props = nodeProps('text', true, true)
    props.data.locked = true
    view.rerender(<CanvasNode {...props} />)
    await user.click(screen.getByRole('button', { name: '解锁节点' }))
    expect(useCanvasSessionStore.getState().snapshot.nodesById.node.locked).toBe(false)
    expect(useCanvasInteractionStore.getState().announcement.message).toContain('已解锁')
    await user.click(screen.getByRole('button', { name: '创建副本' }))
    const snapshot = useCanvasSessionStore.getState().snapshot
    expect(snapshot.nodeOrder).toHaveLength(2)
    expect(snapshot.nodesById[snapshot.nodeOrder[1]].position).toEqual({ x: 52, y: 62 })
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual([snapshot.nodeOrder[1]])
    expect(useCanvasInteractionStore.getState().announcement.message).toContain('已创建 1 个副本')
    expect(writes).toHaveBeenCalledTimes(3)
  })

  it('does_not_announce_rejected_actions_on_a_missing_node', async () => {
    render(<CanvasNode {...nodeProps('text', true, true)} />)
    const previous = useCanvasInteractionStore.getState().announcement
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '锁定节点' }))
    await user.click(screen.getByRole('button', { name: '创建副本' }))
    expect(useCanvasInteractionStore.getState().announcement).toBe(previous)
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toEqual([])
  })
  it.each([
    { type: 'text' as const, label: '文本', placeholder: '请输入您的指令、提示词或脚本等...', detail: '0 字' },
    { type: 'image' as const, label: '图片', placeholder: '图片预览', detail: '暂无图片' },
    { type: 'video' as const, label: '视频', placeholder: '视频预览（16:9）', detail: '00:00' },
    { type: 'audio' as const, label: '音频', placeholder: '音频波形预览', detail: '00:00' },
  ])('renders $type as a lightweight Maolong-style canvas component', ({ type, label, placeholder, detail }) => {
    render(<CanvasNode {...nodeProps(type)} />)
    const node = screen.getByRole('article', { name: `我的节点 · ${label}节点` })
    expect(node).toHaveAttribute('data-layout', 'compact')
    expect(within(node).getByText('我的节点')).toBeInTheDocument()
    expect(within(node).queryByText(label)).not.toBeInTheDocument()
    expect(within(node).queryByText('空白')).not.toBeInTheDocument()
    expect(within(node).queryByText('等待内容')).not.toBeInTheDocument()
    expect(within(node).getByText(detail)).toBeInTheDocument()
    if (type === 'text') expect(within(node).getByPlaceholderText(placeholder)).toBeInTheDocument()
    else expect(within(node).getByRole('img', { name: placeholder })).toBeInTheDocument()
    expect(within(node).queryByRole('region', { name: '节点生成面板' })).not.toBeInTheDocument()
  })

  it('expands_in_place_and_collapses_when_selection_becomes_multiple_or_empty', () => {
    const props = nodeProps('text', true, true)
    const before = structuredClone(props)
    const view = render(<CanvasNode {...props} />)
    expect(screen.getByRole('article')).toHaveAttribute('data-layout', 'expanded')
    expect(screen.getByRole('article')).toHaveAccessibleDescription(/已选中/)
    expect(screen.getByRole('region', { name: '节点生成面板' })).toBeInTheDocument()
    expect(props).toEqual(before)
    view.rerender(<CanvasNode {...nodeProps('text', true, false)} />)
    expect(screen.getByRole('article')).toHaveAttribute('data-layout', 'compact')
    expect(screen.queryByRole('region', { name: '节点生成面板' })).not.toBeInTheDocument()
    view.rerender(<CanvasNode {...nodeProps('text')} />)
    expect(screen.getByRole('article')).toHaveAccessibleDescription(/未选中/)
  })

  it('long_pressing_the_node_body_drags_and_commits_the_card_once', () => {
    vi.useFakeTimers()
    const now = '2026-10-04T00:00:00.000Z'
    useCanvasSessionStore.getState().executeCommand({ type: 'create-node', node: {
      id: 'node', type: 'text', role: 'blank', name: '我的节点', locked: false, position: { x: 20, y: 30 }, display: { width: 358, height: 270 },
      versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
    } })
    render(<CanvasNode {...nodeProps('text')} />)
    const node = screen.getByRole('article')
    const body = screen.getByRole('textbox', { name: '文本内容' })
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.pointerDown(body, { pointerId: 1, clientX: 100, clientY: 100, button: 0 })
    act(() => vi.advanceTimersByTime(50))
    fireEvent.pointerMove(node, { pointerId: 1, clientX: 160, clientY: 170 })
    expect(useCanvasInteractionStore.getState().nodePreviewPositions.get('node')).toEqual({ x: 80, y: 100 })
    expect(writes).not.toHaveBeenCalled()
    fireEvent.pointerUp(node, { pointerId: 1, clientX: 160, clientY: 170 })
    expect(useCanvasSessionStore.getState().snapshot.nodesById.node.position).toEqual({ x: 80, y: 100 })
    expect(useCanvasInteractionStore.getState().nodePreviewPositions.size).toBe(0)
    expect(writes).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it.each([
    ['text', '文本快捷操作', ['0 字', '帮我写', '展开']],
    ['image', '图片快捷操作', ['上传', '从资产库选择']],
    ['video', '视频快捷操作', ['上传', '从资产库选择']],
  ] as const)('matches the selected %s node composition from the reference canvas', (type, toolbarName, actions) => {
    render(<CanvasNode {...nodeProps(type, true, true)} />)
    const node = screen.getByRole('article')
    const toolbar = within(node).getByRole('toolbar', { name: toolbarName })
    expect(toolbar).toBeVisible()
    for (const action of actions) expect(within(toolbar).getByRole('button', { name: action })).toBeVisible()
    expect(within(node).getByRole('region', { name: '节点生成面板' })).toBeVisible()
    expect(within(node).getByRole('region', { name: '节点媒体主体' })).toHaveAttribute('data-content-type', type)
    expect(node.querySelector(`[data-icon='${type}']`)).toBeInTheDocument()
    if (type !== 'text') expect(node.querySelector(`[data-icon='${type}-placeholder']`)).toBeInTheDocument()
    expect(within(node).getAllByText('+')).toHaveLength(2)
  })

  it('communicates_locked_state_with_visible_text_and_accessibility', () => {
    const props = nodeProps('image', true)
    props.data.locked = true
    props.data.role = 'imported'
    render(<CanvasNode {...props} />)
    expect(screen.queryByText('已锁定')).not.toBeInTheDocument()
    expect(screen.queryByText('导入')).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveAccessibleDescription(/已锁定，无法移动、连接或删除/)
  })

  it('uses the reference prompt as the editable placeholder without duplicated overlay copy', () => {
    const now = '2026-10-04T00:00:00.000Z'
    useCanvasSessionStore.getState().executeCommand({ type: 'create-node', node: {
      id: 'node', type: 'image', role: 'blank', name: '我的节点', locked: false, position: { x: 0, y: 0 }, display: { width: 358, height: 270 },
      versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now,
    } })
    render(<CanvasNode {...nodeProps('image', true, true)} />)
    expect(screen.getByRole('textbox', { name: 'AI 指令' })).toHaveAttribute('placeholder', '可连线添加素材并 @引用，描述你想生成或编辑的图片。例如：生成一张电商主图，突出商品质感、使用场景和促销氛围。')
    expect(document.querySelector('.canvas-node__prompt-copy')).not.toBeInTheDocument()
  })

  it.each([
    { type: 'text' as const, controls: [['生成文本', '阶段三开放：内容与生成']] },
    { type: 'image' as const, controls: [['本地选择', '阶段三开放：内容与生成'], ['资产库', '阶段五开放：资产库'], ['生成图片', '阶段三开放：内容与生成']] },
    { type: 'video' as const, controls: [['播放视频', '阶段四开放：媒体播放'], ['生成视频', '阶段三开放：内容与生成']] },
    { type: 'audio' as const, controls: [['播放音频', '阶段四开放：媒体播放'], ['生成音频', '阶段三开放：内容与生成']] },
  ])('disables every future $type control with an accessible stage explanation', ({ type, controls }) => {
    render(<CanvasNode {...nodeProps(type, true, true)} />)
    for (const [name, explanation] of controls) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription(explanation)
    }
    expect(screen.getAllByRole('button').filter((button) => button.hasAttribute('disabled'))).toHaveLength(controls.length)
  })

  it('keeps_the_shared_component_in_the_module_level_registry', () => {
    expect(nodeTypes.canvasNode).toBe(CanvasNode)
  })
})
