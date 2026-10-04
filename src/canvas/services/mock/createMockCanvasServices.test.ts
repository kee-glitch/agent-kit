import { describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import type { CanvasServices } from '../contracts/canvasServices'
import { createMockCanvasServices } from './createMockCanvasServices'

describe('mock canvas service contracts', () => {
  it('returns_deterministic_asset_fixtures_and_empty_template_results', async () => {
    const services = createMockCanvasServices({ fixtureId: 'fixture-1' })
    expect((await services.assets.listAssets()).map(({ id, type }) => ({ id, type }))).toEqual([
      { id: 'asset-image-product', type: 'image' },
      { id: 'asset-video-city', type: 'video' },
      { id: 'asset-audio-voice', type: 'audio' },
    ])
    expect(await services.assets.listAssets()).toEqual(await services.assets.listAssets())
    expect(await services.templates.listTemplates()).toEqual([])
    expect(await services.templates.listTemplates()).toEqual([])
  })

  it('creates_an_interrupted_task_result_without_randomness', async () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Randomness is forbidden') })
    try {
      const services = createMockCanvasServices({ fixtureId: 'fixture-1' })
      const snapshot = createEmptySnapshot('canvas-1', '2026-10-04T00:00:00.000Z')
      const before = JSON.stringify(snapshot)
      const request = { nodeId: 'node-1', snapshot }
      const expected = {
        id: 'fixture-1', nodeId: 'node-1', status: 'interrupted',
        createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
        error: 'Phase one mock service does not execute tasks.',
      }

      expect(await services.tasks.startTask(request)).toEqual(expected)
      expect(await services.tasks.startTask(request)).toEqual(expected)
      expect(await services.tasks.cancelTask(request)).toEqual(expected)
      expect(await services.tasks.retryTask(request)).toEqual(expected)
      const draft = { nodeId: 'node-1', type: 'text' as const, content: 'Editor text' }
      const originalDraft = { ...draft }
      expect(await services.mediaExport.exportEditorDraft(draft, snapshot)).toEqual({
        fixtureId: 'fixture-1', status: 'interrupted',
      })
      expect(await services.mediaExport.exportEditorDraft(draft, snapshot)).toEqual({
        fixtureId: 'fixture-1', status: 'interrupted',
      })
      await services.assets.listAssets()
      await services.templates.listTemplates()
      expect(JSON.stringify(snapshot)).toBe(before)
      expect(draft).toEqual(originalDraft)
    } finally {
      random.mockRestore()
    }
  })

  it('uses_a_stable_default_fixture_and_returns_independent_results', async () => {
    const services = createMockCanvasServices()
    const request = { nodeId: 'node-1', snapshot: createEmptySnapshot('canvas-1', '2026-10-04T00:00:00.000Z') }
    const first = await services.tasks.startTask(request)
    const second = await services.tasks.startTask(request)
    expect(first).toEqual(second)
    expect(first.id).toBe('mock-task')
    first.status = 'completed'
    expect(second.status).toBe('interrupted')
    const assets = await services.assets.listAssets()
    assets.push({ id: 'local', name: 'local', type: 'text', content: 'local' })
    expect(await services.assets.listAssets()).toHaveLength(3)
  })

  it('allows_a_real_exporter_to_replace_the_mock_port', async () => {
    const services: CanvasServices = {
      ...createMockCanvasServices(),
      mediaExport: {
        exportEditorDraft: async (draft) => ({
          status: 'completed', fileName: 'draft.txt', blob: new Blob([draft.content ?? '']),
        }),
      },
    }
    const result = await services.mediaExport.exportEditorDraft(
      { nodeId: 'node-1', type: 'text', content: 'Hello' },
      createEmptySnapshot('canvas-1', '2026-10-04T00:00:00.000Z'),
    )
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.fileName).toBe('draft.txt')
      expect(result.blob.size).toBe(5)
    }
  })
})
