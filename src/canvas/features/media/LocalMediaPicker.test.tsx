import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useLocalMediaStore } from '../../stores/useLocalMediaStore'
import { LocalMediaPicker } from './LocalMediaPicker'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  useLocalMediaStore.getState().reset()
  const snapshot = createEmptySnapshot('media', now)
  snapshot.nodesById.image = { id: 'image', type: 'image', role: 'blank', name: '图片', position: { x: 0, y: 0 },
    locked: false, display: { width: 320, height: 260 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
    taskId: null, createdAt: now, updatedAt: now }
  snapshot.nodeOrder = ['image']
  useCanvasSessionStore.setState({ snapshot })
})

describe('LocalMediaPicker', () => {
  it('shows_the_selected_asset_instead_of_a_stale_local_object_url', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stale')
    useLocalMediaStore.getState().attach('image', new File(['old'], 'old.png', { type: 'image/png' }))
    const snapshot = useCanvasSessionStore.getState().snapshot
    useCanvasSessionStore.setState({ snapshot: { ...snapshot, nodesById: { ...snapshot.nodesById, image: { ...snapshot.nodesById.image,
      input: { ...snapshot.nodesById.image.input!, media: { source: 'asset', name: '产品参考图', mimeType: 'image/fixture', assetId: 'asset-image-product', durationSeconds: null, requiresReselect: false } },
    } } } })
    render(<LocalMediaPicker nodeId="image" type="image" />)
    expect(screen.getByRole('img', { name: '产品参考图' })).toHaveAttribute('src', '/fixtures/asset-image.svg')
    expect(screen.queryByRole('img', { name: 'old.png' })).not.toBeInTheDocument()
  })
  it('accepts_matching_files_and_persists_metadata_without_the_file_or_url', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    render(<LocalMediaPicker nodeId="image" type="image" />)
    const input = screen.getByLabelText('选择本地图片')
    expect(input).toHaveAttribute('accept', 'image/*')
    await userEvent.upload(input, new File(['image'], 'photo.png', { type: 'image/png' }))
    expect(screen.getByRole('img', { name: 'photo.png' })).toHaveAttribute('src', 'blob:preview')
    const serialized = JSON.stringify(useCanvasSessionStore.getState().snapshot)
    expect(serialized).toContain('photo.png')
    expect(serialized).not.toContain('blob:preview')
  })
})
