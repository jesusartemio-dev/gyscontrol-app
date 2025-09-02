/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * 🧪 Configuración específica para tests de eventos
 * 
 * Esta configuración evita problemas con Tailwind CSS
 * y se enfoca únicamente en testing de lógica de negocio.
 */
export default defineConfig({
  test: {
    environment: 'node', // Usar node en lugar de jsdom para evitar CSS
    globals: true,
    include: ['src/__tests__/lib/events/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'src/__tests__/components/**',
      'src/__tests__/app/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/lib/events/**/*.ts'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Configuración mínima sin CSS
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'node18'
  },
  // Evitar cualquier procesamiento de CSS - omitir configuración CSS
  // No cargar plugins que puedan interferir
  plugins: []
})