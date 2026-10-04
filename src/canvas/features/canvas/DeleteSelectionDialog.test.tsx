import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteSelectionDialog } from './DeleteSelectionDialog'

describe('DeleteSelectionDialog', () => {
  it('states_counts_traps_focus_cancels_with_escape_and_returns_to_trigger', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const cancel = vi.fn()
    const confirm = vi.fn()
    const view = render(<DeleteSelectionDialog eligibleCount={2} lockedCount={1} incidentEdgeCount={3} trigger={trigger} onCancel={cancel} onConfirm={confirm} />)
    const dialog = screen.getByRole('dialog', { name: '删除所选节点' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription(/删除 2 个节点及 3 条关联关系.*1 个锁定节点将保留/)
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '确认删除' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
    view.unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('calls_only_the_selected_cancel_or_confirm_action', async () => {
    const cancel = vi.fn()
    const confirm = vi.fn()
    render(<DeleteSelectionDialog eligibleCount={1} lockedCount={0} incidentEdgeCount={0} trigger={document.body} onCancel={cancel} onConfirm={confirm} />)
    expect(screen.queryByText(/锁定节点将保留/)).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '确认删除' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })
})
