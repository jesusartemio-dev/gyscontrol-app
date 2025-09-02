/**
 * Mock de Tailwind CSS para Tests
 */

import { vi } from 'vitest'

// Mock de Tailwind CSS
vi.mock('tailwindcss', () => ({
  default: vi.fn(() => ({})),
  plugin: vi.fn(() => ({})),
  colors: {},
  __esModule: true
}))

// Mock de archivos CSS
vi.mock('tailwindcss/tailwind.css', () => ({}))
vi.mock('./tailwind.css', () => ({}))
vi.mock('tailwindcss/lib/css/preflight.css', () => ({}))
vi.mock('tailwindcss/lib/css/base.css', () => ({}))
vi.mock('tailwindcss/lib/css/components.css', () => ({}))
vi.mock('tailwindcss/lib/css/utilities.css', () => ({}))

// Mock específico para el error de "./tailwind.css" specifier
vi.mock('tailwindcss/tailwind.css', () => ({ default: '', __esModule: true }))
vi.mock('tailwindcss/lib/tailwind.css', () => ({ default: '', __esModule: true }))
vi.mock('tailwindcss/dist/tailwind.css', () => ({ default: '', __esModule: true }))
vi.mock('tailwindcss/plugin', () => ({
  default: vi.fn(() => ({})),
  plugin: vi.fn(() => ({})),
  colors: {},
  __esModule: true
}))
vi.mock('tailwindcss/colors', () => ({ default: {}, __esModule: true }))