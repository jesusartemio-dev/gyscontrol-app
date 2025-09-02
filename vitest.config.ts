/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/**/__tests__/',
        'src/**/__mocks__/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        'public/',
        'prisma/',
        '*.md',
        '*.mdx',
        'src/app/globals.css',
        'src/app/layout.tsx',
        'src/app/loading.tsx',
        'src/app/error.tsx',
        'src/app/not-found.tsx',
        'middleware.ts',
        'instrumentation.ts'
      ],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        },
        // 📊 Archivos críticos con threshold más alto
        'src/lib/auth.ts': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90
        },
        'src/lib/prisma.ts': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90
        },
        'src/lib/services/**': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        },
        'src/app/api/**': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        }
      },
      all: true,
      skipFull: false,
      clean: true
    },
    // ⚡ Configuración de performance
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // 🔧 Configuración de archivos
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
      'e2e/'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Handle CSS imports - disable CSS processing entirely for tests
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // Don't load any plugins that might interfere
  plugins: [],
  // Handle module resolution for UI components
  optimizeDeps: {
    include: ['@testing-library/jest-dom'],
    exclude: ['tailwindcss', '@tailwindcss/typography']
  },
  ssr: {
    noExternal: ['tailwindcss', '@tailwindcss/typography']
  },
  // Override environment
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'node14'
  }
})