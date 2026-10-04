import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { TaskStatusPanel } from './TaskStatusPanel'

const now = '2026-10-04T00:00:00.000Z'

function seedTask(status: 'processing' | 'failed' | 'interrupted' | 'source-missing' | 'completed') {
  const snapshot = createEmptySnapshot('task', now)
  snapshot.nodesById.source = { id: 'source', type: 'image', role: 'blank', name: '来源', locked: false, position: { x: 0, y: 0 },
    display: { width: 320, height: 260 }, input: { ...createEmptyNodeInput(), prompt: '产品图' }, versionIds: [], currentVersionId: null, taskId: null,
    createdAt: now, updatedAt: now }
  snapshot.nodesById.result = { id: 'result', type: 'image', role: 'generated', name: '生成结果', locked: false, position: { x: 400, y: 0 },
    display: { width: 320, height: 260 }, input: createEmptyNodeInput(), versionIds: status === 'completed' ? ['version'] : [],
    currentVersionId: status === 'completed' ? 'version' : null, taskId: 'task', createdAt: now, updatedAt: now }
  if (status === 'completed') snapshot.versionsById.version = { id: 'version', nodeId: 'result', createdAt: now, content: '/fixtures/generated-image.svg' }
  snapshot.nodeOrder.push('source', 'result')
  snapshot.versionOrder.push(...(status === 'completed' ? ['version'] : []))
  snapshot.tasksById.task = { id: 'task', nodeId: 'result', sourceNodeId: 'source', resultNodeId: 'result', status,
    request: { contentType: 'image', prompt: '产品图', referenceNodeIds: [], voiceTargetNodeId: null, generationConfig: null },
    attempt: 1, error: status === 'failed' ? '模拟生成失败' : undefined, createdAt: now, updatedAt: now }
  useCanvasSessionStore.setState({ snapshot })
}

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
})

describe('TaskStatusPanel', () => {
  it('keeps_the_result_on_cancel_and_offers_original_and_modified_retry_after_failure', async () => {
    seedTask('processing')
    const cancel = vi.fn()
    const view = render(<TaskStatusPanel taskId="task" onCancel={cancel} onRetry={vi.fn()} onModify={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '取消生成' }))
    expect(cancel).toHaveBeenCalledOnce()
    expect(useCanvasSessionStore.getState().snapshot.nodesById.result).toBeTruthy()

    seedTask('failed')
    const retry = vi.fn()
    const modify = vi.fn()
    view.rerender(<TaskStatusPanel taskId="task" onCancel={cancel} onRetry={retry} onModify={modify} />)
    await userEvent.click(screen.getByRole('button', { name: '原配置重试' }))
    await userEvent.click(screen.getByRole('button', { name: '修改参数' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(modify).toHaveBeenCalledOnce()
  })

  it.each([
    ['interrupted', '生成已中断，可按原配置重试'],
    ['source-missing', '来源节点已不存在，请返回画布重新选择来源'],
    ['completed', '生成完成'],
  ] as const)('explains_%s_state', (status, message) => {
    seedTask(status)
    render(<TaskStatusPanel taskId="task" onCancel={vi.fn()} onRetry={vi.fn()} onModify={vi.fn()} />)
    expect(screen.getByText(message)).toBeVisible()
    if (status === 'completed') expect(screen.getByRole('img', { name: '生成图片预览' })).toHaveAttribute('src', '/fixtures/generated-image.svg')
  })
})
