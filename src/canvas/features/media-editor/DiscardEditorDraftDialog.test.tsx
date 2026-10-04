import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DiscardEditorDraftDialog } from './DiscardEditorDraftDialog'
describe('discard editor draft dialog', () => {
  it('offers_save_discard_and_continue', async () => {
    const user = userEvent.setup(), discard = vi.fn()
    render(<DiscardEditorDraftDialog onSave={vi.fn()} onDiscard={discard} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '放弃草稿' }))
    expect(discard).toHaveBeenCalled()
  })
})
