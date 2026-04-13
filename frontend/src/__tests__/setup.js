/**
 * Vitest setup file for frontend tests.
 * Configures jsdom environment, MSW, and cleanup.
 */
import { server } from '../mocks/server'
import { afterAll, afterEach, beforeAll } from 'vitest'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// React Flow (and some layout libs) expect ResizeObserver in the browser
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.matchMedia =
  global.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }
  }

// Mock localStorage for all tests
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
