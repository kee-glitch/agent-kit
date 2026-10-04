import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySnapshot } from '../../domain/canvas/createEmptySnapshot'
import { createEmptyNodeInput } from '../../domain/canvas/migrateSnapshot'
import { hydrateCanvasSession, useCanvasSessionStore } from '../../stores/useCanvasSessionStore'
import { PromptComposer } from './PromptComposer'

const now = '2026-10-04T00:00:00.000Z'

beforeEach(() => {
  localStorage.clear()
  hydrateCanvasSession(localStorage, now)
  const snapshot = createEmptySnapshot('content', now)
  for (const [id, type, name] of [['text', 'text', '文案'], ['image', 'image', '产品图']] as const) {
    snapshot.nodesById[id] = { id, type, name, role: 'blank', position: { x: 0, y: 0 }, locked: false,
      display: { width: 280, height: 180 }, input: createEmptyNodeInput(), versionIds: [], currentVersionId: null,
      taskId: null, createdAt: now, updatedAt: now }
    snapshot.nodeOrder.push(id)
  }
  useCanvasSessionStore.setState({ snapshot })
})

describe('PromptComposer', () => {
  it('keeps_body_and_instruction_separate_and_inserts_a_stable_mention', async () => {
    const user = userEvent.setup()
    render(<PromptComposer nodeId="text" />)
    await user.type(screen.getByRole('textbox', { name: '正文内容' }), '一段正文')
    await user.tab()
    await user.type(screen.getByRole('textbox', { name: 'AI 指令' }), '@')
    expect(screen.getByRole('listbox', { name: '引用节点' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: '产品图 · 图片' }))
    const node = useCanvasSessionStore.getState().snapshot.nodesById.text
    expect(node.input?.body).toBe('一段正文')
    expect(node.input?.prompt).toContain('@[产品图](node:image)')
    expect(node.input?.referenceNodeIds).toEqual(['image'])
  })

  it('appends_a_prompt_preset_without_overwriting_existing_text', async () => {
    const user = userEvent.setup()
    render(<PromptComposer nodeId="text" />)
    const prompt = screen.getByRole('textbox', { name: 'AI 指令' })
    await user.type(prompt, '保留原文')
    await user.click(screen.getByRole('button', { name: '使用提示词：电影感' }))
    expect((prompt as HTMLTextAreaElement).value).toContain('保留原文')
    expect((prompt as HTMLTextAreaElement).value).toContain('电影感')
  })
})
