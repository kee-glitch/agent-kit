import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { AssetPickerDialog } from './AssetPickerDialog'

const now = '2026-10-04T00:00:00.000Z'
beforeEach(() => {
  localStorage.clear(); hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('assets', now)
  snapshot.nodesById.image = { id: 'image', type: 'image', role: 'blank', name: '图片', position: { x: 0, y: 0 }, locked: false,
    display: { width: 320, height: 260 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null, taskId: null,
    createdAt: now, updatedAt: now }
  snapshot.nodeOrder = ['image']; useCanvasSessionStore.setState({ snapshot })
})

describe('AssetPickerDialog', () => {
  it('filters_for_replace_media_and_applies_exactly_one_asset', async () => {
    const user = userEvent.setup()
    render(<AssetPickerDialog purpose="replace-media" nodeId="image" onClose={() => undefined} />)
    expect(await screen.findByRole('option', { name: '产品参考图 · 图片' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /城市镜头/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认选择' })).toBeDisabled()
    await user.click(screen.getByRole('option', { name: '产品参考图 · 图片' }))
    await user.click(screen.getByRole('button', { name: '确认选择' }))
    expect(useCanvasSessionStore.getState().snapshot.nodesById.image.input?.media).toMatchObject({
      source: 'asset', assetId: 'asset-image-product', name: '产品参考图',
    })
  })
})
