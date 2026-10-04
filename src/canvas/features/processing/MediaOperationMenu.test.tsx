import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MediaOperationMenu } from './MediaOperationMenu'

describe('media operation menu', () => {
  it('shows_exact_image_actions_and_video_hierarchy', async () => {
    const user = userEvent.setup()
    render(<MediaOperationMenu type="image" onSelect={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '媒体处理' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['图片分析', '图片编辑', '隐私保护'])
    render(<MediaOperationMenu type="video" onSelect={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: '媒体处理' })[1])
    for (const name of ['片段重拍', '脚本拆解', '视频抽帧', '视频处理']) expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: '视频处理' }))
    for (const name of ['画质增强', '字幕擦除', '去水印', '换音色', '动作提取']) expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
  })
  it('renders_nothing_for_text_and_audio_nodes', () => {
    const { container, rerender } = render(<MediaOperationMenu type="text" onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<MediaOperationMenu type="audio" onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
