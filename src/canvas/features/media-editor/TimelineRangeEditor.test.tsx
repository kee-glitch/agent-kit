import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimelineRangeEditor } from './TimelineRangeEditor'
describe('timeline range editor', () => {
  it('reports_in_and_out_points_through_native_controls', () => {
    const onChange = vi.fn()
    render(<TimelineRangeEditor duration={10} inPoint={1} outPoint={8} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('入点'), { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith({ inPoint: 2, outPoint: 8 })
  })
})
