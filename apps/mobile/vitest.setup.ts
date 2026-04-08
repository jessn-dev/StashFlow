import '@testing-library/jest-native/extend-expect'
import { vi } from 'vitest'

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
