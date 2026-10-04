import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { VideoGenerationPanel } from './VideoGenerationPanel'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('video', now)
  snapshot.nodesById.video = { id: 'video', type: 'video', role: 'blank', name: '短片', locked: false,
    position: { x: 0, y: 0 }, display: { width: 360, height: 260 }, versionIds: [], currentVersionId: null,
    taskId: null, input: { ...createEmptyNodeInput(), prompt: '镜头缓慢推进' }, createdAt: now, updatedAt: now }
  snapshot.nodeOrder.push('video')
  useCanvasSessionStore.setState({ snapshot })
})

describe('VideoGenerationPanel', () => {
  it('renders_data_driven_video_options_and_explains_voice_target_incompatibility', async () => {
    const user = userEvent.setup()
    render(<VideoGenerationPanel nodeId="video" />)
    expect(within(screen.getByLabelText('视频比例')).getAllByRole('option').map((item) => item.textContent))
      .toEqual(['1:1', '9:16', '3:4', '16:9', '4:3'])
    expect(within(screen.getByLabelText('视频分辨率')).getAllByRole('option').map((item) => item.textContent)).toEqual(['720p', '1080p'])
    expect(within(screen.getByLabelText('视频时长')).getAllByRole('option').map((item) => item.textContent)).toEqual(['5 秒', '10 秒'])
    expect(within(screen.getByLabelText('视频声音')).getAllByRole('option').map((item) => item.textContent)).toEqual(['无声音', '生成声音', '目标音色'])

    await user.selectOptions(screen.getByLabelText('视频声音'), 'voice-target')
    expect(screen.getByRole('button', { name: '生成视频' })).toBeDisabled()
    expect(screen.getByText('请先选择目标音色')).toBeVisible()
  })
})
