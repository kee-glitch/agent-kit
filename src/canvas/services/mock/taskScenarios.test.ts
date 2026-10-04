import { describe, expect, it, vi } from 'vitest'
import { createTaskScenarioRunner } from './taskScenarios'

function scheduler() {
  const queue: (() => void)[] = []
  return {
    schedule: (callback: () => void) => { queue.push(callback); return () => undefined },
    flush: () => { while (queue.length) queue.shift()!() },
  }
}

describe('deterministic task scenarios', () => {
  it('emits_the_complete_success_sequence_without_randomness', () => {
    const fake = scheduler()
    const events: string[] = []
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('randomness forbidden') })
    createTaskScenarioRunner({ scenario: 'success', now: () => '2026-10-04T00:00:00.000Z', schedule: fake.schedule })
      .start({ taskId: 'task', resultNodeId: 'result', contentType: 'image' }, (event) => events.push(event.status))
    fake.flush()
    expect(events).toEqual(['input-preparation', 'validation', 'asset-preparation', 'queued', 'processing', 'result-upload', 'completed'])
    random.mockRestore()
  })

  it('cancels_once_and_ignores_late_scheduled_events', () => {
    const fake = scheduler()
    const events: string[] = []
    const handle = createTaskScenarioRunner({ scenario: 'success', now: () => 'now', schedule: fake.schedule })
      .start({ taskId: 'task', resultNodeId: 'result', contentType: 'video' }, (event) => events.push(event.status))
    handle.cancel()
    handle.cancel()
    fake.flush()
    expect(events).toEqual(['cancelled'])
  })
})
