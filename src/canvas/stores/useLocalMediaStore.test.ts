import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalMediaStore } from './useLocalMediaStore'

describe('local media runtime', () => {
  beforeEach(() => useLocalMediaStore.getState().reset())

  it('creates_one_url_and_revokes_it_on_replace_remove_and_reset', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const first = new File(['a'], 'first.png', { type: 'image/png' })
    const second = new File(['b'], 'second.png', { type: 'image/png' })
    useLocalMediaStore.getState().attach('node', first)
    useLocalMediaStore.getState().attach('node', second)
    expect(create).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenCalledWith('blob:first')
    useLocalMediaStore.getState().remove('node')
    expect(revoke).toHaveBeenCalledWith('blob:second')
    expect(useLocalMediaStore.getState().entries).toEqual({})
  })
})
