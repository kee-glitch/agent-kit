import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { useCanvasInteractionStore } from '../../stores/useCanvasInteractionStore'
import { ImageGenerationPanel } from './ImageGenerationPanel'

const now = '2026-10-04T00:00:00.000Z'

function seedImage(prompt = '') {
  const snapshot = createEmptySnapshot('generation', now)
  snapshot.nodesById.image = { id: 'image', type: 'image', role: 'blank', name: '产品图', locked: false,
    position: { x: 40, y: 60 }, display: { width: 320, height: 260 }, versionIds: [], currentVersionId: null,
    taskId: null, input: { ...createEmptyNodeInput(), prompt }, createdAt: now, updatedAt: now }
  snapshot.nodeOrder.push('image')
  useCanvasSessionStore.setState({ snapshot })
}

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  useCanvasInteractionStore.getState().clearSelection()
})

describe('ImageGenerationPanel', () => {
  it('shows_the_exact_image_options_and_persists_configuration_changes', async () => {
    seedImage('生成一张产品主图')
    const user = userEvent.setup()
    render(<ImageGenerationPanel nodeId="image" />)

    expect(within(screen.getByLabelText('图片比例')).getAllByRole('option').map((item) => item.textContent))
      .toEqual(['自动', '1:1', '9:16', '3:4', '16:9', '4:3'])
    expect(within(screen.getByLabelText('图片分辨率')).getAllByRole('option').map((item) => item.textContent))
      .toEqual(['1K', '2K', '4K'])
    expect(within(screen.getByLabelText('图片质量')).getAllByRole('option').map((item) => item.textContent))
      .toEqual(['标准', '高'])
    expect(within(screen.getByLabelText('图片格式')).getAllByRole('option').map((item) => item.textContent))
      .toEqual(['PNG', 'JPEG'])
    expect(screen.queryByText('生成音频')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('图片比例'), '16:9')
    expect(useCanvasSessionStore.getState().snapshot.nodesById.image.input?.generationConfig)
      .toMatchObject({ kind: 'image', aspectRatio: '16:9' })
  })

  it('validates_the_prompt_and_creates_and_selects_a_result_node_immediately', async () => {
    seedImage()
    const user = userEvent.setup()
    render(<ImageGenerationPanel nodeId="image" />)
    const submit = screen.getByRole('button', { name: '生成图片' })
    expect(submit).toBeDisabled()
    expect(screen.getByText('请输入 AI 指令或添加参考节点')).toBeVisible()

    useCanvasSessionStore.getState().executeCommand({ type: 'update-node-prompt', nodeId: 'image', prompt: '生成一张产品主图', mentionNodeIds: [], now })
    render(<ImageGenerationPanel nodeId="image" />)
    await user.click(screen.getAllByRole('button', { name: '生成图片' })[1])

    const snapshot = useCanvasSessionStore.getState().snapshot
    const resultId = snapshot.nodeOrder.find((id) => id !== 'image')
    expect(resultId).toBeTruthy()
    expect(snapshot.tasksById[snapshot.nodesById[resultId!].taskId!].request?.prompt).toBe('生成一张产品主图')
    expect(snapshot.edgeOrder.map((id) => snapshot.edgesById[id].relationType)).toContain('derived')
    expect([...useCanvasInteractionStore.getState().selectedNodeIds]).toEqual([resultId])
  })
})
