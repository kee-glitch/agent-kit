import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createEditorDraft } from './mediaEditorModel'
import { CropEditor } from './CropEditor'
import { SpliceEditor } from './SpliceEditor'

describe('media editor modes', () => {
  it('updates_crop_ratio_and_safe_area', async () => {
    const user = userEvent.setup(), onChange = vi.fn()
    render(<CropEditor draft={createEditorDraft('crop', { id: 'a', durationSeconds: 10 }, [])} onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText('裁剪比例'), '16:9')
    await user.click(screen.getByLabelText('显示安全区'))
    expect(onChange).toHaveBeenCalled()
  })
  it('reorders_and_removes_splice_clips_and_reports_minimum', async () => {
    const user = userEvent.setup(), onChange = vi.fn()
    render(<SpliceEditor draft={createEditorDraft('splice', { id: 'a', durationSeconds: 10 }, ['a'])} names={{ a: '片段 A' }} onChange={onChange} />)
    expect(screen.getByRole('alert')).toHaveTextContent('至少需要两个视频片段')
    await user.click(screen.getByRole('button', { name: '移除片段 A' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
