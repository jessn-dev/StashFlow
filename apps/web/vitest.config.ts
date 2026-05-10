import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      all: false,
      reporter: ['text', 'lcov', 'html'],
      include: [],
      exclude: ['**/*.d.ts'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
