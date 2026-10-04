import { describe, expect, it } from 'vitest'
import { formatMentionToken, parseMentionTokens, removeMentionTokens } from './mentions'

describe('canvas mention tokens', () => {
  it('round_trips_stable_node_ids_and_deduplicates_repeated_mentions', () => {
    const token = formatMentionToken({ id: 'image-1', name: '产品图' })
    expect(token).toBe('@[产品图](node:image-1)')
    expect(parseMentionTokens(`参考 ${token} 再看 ${token}`)).toEqual(['image-1'])
  })

  it('removes_only_tokens_for_the_requested_node', () => {
    const prompt = '用 @[产品图](node:image-1) 和 @[风格](node:image-2) 生成'
    expect(removeMentionTokens(prompt, 'image-1')).toBe('用 和 @[风格](node:image-2) 生成')
  })
})
