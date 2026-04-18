import '@testing-library/jest-native/extend-expect'
import { vi } from 'vitest'

// Mock matchMedia for Tamagui/Web
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock react-native
vi.mock('react-native', () => {
  const React = require('react')
  const ReactNative = require('react-native-web')
  return ReactNative
})

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

// Mock polyfill
vi.mock('react-native-url-polyfill/auto', () => ({}))
