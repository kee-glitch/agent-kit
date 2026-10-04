import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { configurable: true, get: () => 1280 },
  offsetHeight: { configurable: true, get: () => 800 },
})

afterEach(cleanup)
