import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['@stashflow/core', '@stashflow/api', '@stashflow/theme', 'react', 'react-dom']
      }
    }
  },
})