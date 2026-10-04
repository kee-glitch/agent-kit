import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { NodeCreateMenu } from './NodeCreateMenu'

beforeEach(() => {
  vi.restoreAllMocks()
  useCanvasInteractionStore.setState({ tool: 'select', createMenu: null, selectedNodeIds: new Set() })
})

function openMenu(anchor = { x: 100, y: 200 }, canvasTrigger = false) {
  const trigger = document.createElement(canvasTrigger ? 'section' : 'button')
  trigger.tabIndex = canvasTrigger ? -1 : 0
  document.body.append(trigger)
  useCanvasInteractionStore.getState().openCreateMenu(anchor, { x: -20, y: 40 }, trigger)
  const onCreate = vi.fn()
  const result = render(<NodeCreateMenu onCreate={onCreate} />)
  return { trigger, onCreate, ...result }
}

describe('shared node menu', () => {
  it('shows_four_types_in_order_and_focuses_the_first_choice', () => {
    openMenu()
    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual(['文本', '图片', '视频', '音频'])
    expect(screen.getByText('添加节点')).toBeInTheDocument()
    expect(screen.getByText('添加资源')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '从本地上传' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '从资产库选择' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: '文本' })).toHaveFocus()
  })

  it.each([['{Enter}', 'image'], [' ', 'image']] as const)('chooses_once_with_%s_and_returns_rail_focus', async (key, expected) => {
    const user = userEvent.setup()
    const { trigger, onCreate } = openMenu()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: '图片' })).toHaveFocus()
    await user.keyboard(key)
    expect(onCreate).toHaveBeenCalledExactlyOnceWith(expected)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(useCanvasInteractionStore.getState().createMenu).toBeNull()
    trigger.remove()
  })

  it('wraps_arrow_navigation_and_escape_returns_canvas_focus', async () => {
    const user = userEvent.setup()
    const { trigger, onCreate } = openMenu(undefined, true)
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: '音频' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: '文本' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it.each([false, true])('returns_final_focus_after_clicking_an_outside_textbox_with_canvas_trigger_%s', async (canvasTrigger) => {
    const user = userEvent.setup()
    const { trigger, onCreate } = openMenu(undefined, canvasTrigger)
    render(<input aria-label="画布名称" />)
    await user.click(screen.getByRole('textbox', { name: '画布名称' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    expect(useCanvasInteractionStore.getState().createMenu).toBeNull()
    trigger.remove()
  })

  it.each([{ x: -100, y: -200 }, { x: 1010, y: 740 }])('clamps_measured_menu_with_eight_pixel_margins_%j', (anchor) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 180, bottom: 200, width: 180, height: 200, toJSON: () => ({}) })
    const { trigger } = openMenu(anchor)
    const menu = screen.getByRole('menu')
    const left = Number.parseFloat(menu.style.left)
    const top = Number.parseFloat(menu.style.top)
    expect(left).toBeGreaterThanOrEqual(8)
    expect(top).toBeGreaterThanOrEqual(8)
    expect(left + 180).toBeLessThanOrEqual(window.innerWidth - 8)
    expect(top + 200).toBeLessThanOrEqual(window.innerHeight - 8)
    trigger.remove()
  })

  it('reopens_one_menu_at_the_new_anchor', () => {
    const { trigger } = openMenu()
    act(() => useCanvasInteractionStore.getState().openCreateMenu({ x: 280, y: 120 }, { x: 30, y: 50 }, trigger))
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menu')).toHaveStyle({ left: '280px', top: '120px' })
    expect(screen.getByRole('menuitem', { name: '文本' })).toHaveFocus()
    trigger.remove()
  })
})
