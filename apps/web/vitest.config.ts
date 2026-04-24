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
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.mjs',
        'next-env.d.ts',
        'proxy.ts',
        'app/**/actions.ts', // Exclude server actions as they are hard to unit test without full mocks
        'modules/**/api/**',  // Exclude direct API calls
        'utils/supabase/server.ts'
      ],
      thresholds: {
        lines: 20,
        functions: 13,
        branches: 13,
        statements: 20,
      },
    },
    server: {
      deps: {
        inline: ['@stashflow/core', '@stashflow/api', '@stashflow/theme', 'react', 'react-dom']
      }
    }
  },
})