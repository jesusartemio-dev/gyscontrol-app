/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node', // Use node environment for backend tests
    include: [
      'src/__tests__/lib/events/**/*.test.ts',
      'src/__tests__/lib/config/**/*.test.ts'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/events/**',
        'src/lib/config/**'
      ],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Minimal configuration for backend tests
  plugins: [],
  // Handle module resolution
  optimizeDeps: {
    exclude: ['tailwindcss', '@tailwindcss/typography']
  },
  // Define environment variables
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'node18'
  }
})