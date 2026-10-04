import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { ImageProcessingPanel } from './ImageProcessingPanel'
const now = '2026-10-04T00:00:00.000Z'
beforeEach(() => {
  hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('canvas', now)
  snapshot.nodesById.image = { id: 'image', type: 'image', role: 'imported', name: '图片', position: { x: 0, y: 0 }, locked: false,
    display: { width: 320, height: 260 }, input: { ...createEmptyNodeInput(), media: { source: 'local', name: 'x.png', mimeType: 'image/png', assetId: null, durationSeconds: null, requiresReselect: true } },
    versionIds: [], currentVersionId: null, taskId: null, createdAt: now, updatedAt: now }
  snapshot.nodeOrder = ['image']
  useCanvasSessionStore.setState({ snapshot })
})
describe('image processing panel', () => {
  it('blocks_submission_until_media_is_available_and_creates_a_result_immediately', async () => {
    const user = userEvent.setup()
    render(<ImageProcessingPanel nodeId="image" initialOperation="image-edit" />)
    expect(screen.getByRole('button', { name: '开始图片编辑' })).toBeDisabled()
    expect(screen.getByText('请重新选择本地素材')).toBeInTheDocument()
    const snapshot = useCanvasSessionStore.getState().snapshot
    snapshot.nodesById.image.input!.media!.requiresReselect = false
    useCanvasSessionStore.setState({ snapshot: { ...snapshot, nodesById: { ...snapshot.nodesById } } })
    await user.type(screen.getByLabelText('处理指令'), '擦除背景')
    await user.click(screen.getByRole('button', { name: '开始图片编辑' }))
    expect(useCanvasSessionStore.getState().snapshot.nodeOrder).toHaveLength(2)
    expect(useCanvasSessionStore.getState().snapshot.edgeOrder).toHaveLength(1)
  })
})
