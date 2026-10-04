import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProcessingResultStatus } from './ProcessingResultStatus'
describe('processing result status', () => {
  it('shows_each_branch_status_without_hiding_failed_or_completed_siblings', () => {
    render(<ProcessingResultStatus branches={[{ id: 'a', name: '视频', status: 'completed' }, { id: 'b', name: '音频', status: 'failed' }]} />)
    expect(screen.getByText('视频：已完成')).toBeInTheDocument()
    expect(screen.getByText('音频：失败')).toBeInTheDocument()
  })
})
