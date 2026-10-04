import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { applyEditorEdit, createEditorDraft } from './mediaEditorModel'
import { MediaEditorWorkspace } from './MediaEditorWorkspace'

describe('media editor workspace', () => {
  it('renders_a_bottom_workspace_and_confirms_dirty_exit', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn(), onSave = vi.fn()
    render(<MediaEditorWorkspace draft={{ ...createEditorDraft('clip', { id: 'video', durationSeconds: 10 }, []), dirty: true }} onChange={vi.fn()} onSave={onSave} onClose={onClose} />)
    expect(screen.getByRole('region', { name: '剪辑编辑器' })).toHaveAttribute('data-placement', 'bottom')
    expect(screen.getByLabelText('视频预览')).toHaveProperty('muted', true)
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    expect(screen.getByRole('dialog', { name: '放弃编辑草稿' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '继续编辑' }))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '保存草稿' }))
    expect(onSave).toHaveBeenCalled()
  })
  it('exposes_all_four_editor_modes_from_the_workspace', async () => {
    const user = userEvent.setup(), onModeChange = vi.fn()
    render(<MediaEditorWorkspace draft={createEditorDraft('clip', { id: 'video', durationSeconds: 10 }, [])} onChange={vi.fn()} onSave={vi.fn()} onClose={vi.fn()} onModeChange={onModeChange} />)
    for (const name of ['剪辑', '裁剪', '拼接', '片段选择']) expect(screen.getByRole('button', { name: `切换到${name}` })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '切换到裁剪' }))
    expect(onModeChange).toHaveBeenCalledWith('crop')
  })

  it('exposes_undo_and_redo_for_editor_history', async () => {
    const user = userEvent.setup(), onUndo = vi.fn(), onRedo = vi.fn()
    const edited = applyEditorEdit(createEditorDraft('clip', { id: 'video', durationSeconds: 10 }, []), { inPoint: 1 })
    render(<MediaEditorWorkspace draft={edited} onChange={vi.fn()} onSave={vi.fn()} onClose={vi.fn()} onUndo={onUndo} onRedo={onRedo} />)
    await user.click(screen.getByRole('button', { name: '撤销编辑' }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '重做编辑' })).toBeDisabled()
  })
})
