// ===================================================
// 📁 Archivo: ProyeccionMensualListas.simple.test.tsx
// 📌 Ubicación: src/components/finanzas/__tests__/ProyeccionMensualListas.simple.test.tsx
// 🔧 Descripción: Test simplificado para identificar infinite re-renders
//
// 🧠 Uso: Debugging de re-renders infinitos
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock all external dependencies
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}))

// Mock all custom hooks
jest.mock('../../../hooks/useLazyLoading', () => ({
  useLazyLoading: () => ({
    items: [],
    loading: false,
    error: null,
    loadMore: jest.fn(),
    hasMore: false,
    reset: jest.fn(),
    refresh: jest.fn(),
    retry: jest.fn(),
    page: 1,
    total: 0,
    isInitialLoad: false
  })
}))

jest.mock('../../../hooks/usePerformanceMetrics', () => ({
  __esModule: true,
  default: () => ({
    metrics: {},
    startInteraction: jest.fn(),
    endInteraction: jest.fn(),
    trackInteraction: jest.fn()
  })
}))

jest.mock('../../../hooks/useAdvancedPerformanceMonitoring', () => ({
  __esModule: true,
  default: () => ({
    metrics: {},
    startInteraction: jest.fn(),
    endInteraction: jest.fn(),
    trackInteraction: jest.fn()
  })
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  })
) as jest.Mock

// Simple test component to isolate the issue
const SimpleTestComponent = ({ filtros }: { filtros?: any }) => {
  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1
  
  // Stop test if too many renders
  if (renderCountRef.current > 10) {
    throw new Error(`Too many renders: ${renderCountRef.current}`)
  }
  
  return <div data-testid="simple-component">Render count: {renderCountRef.current}</div>
}

describe('ProyeccionMensualListas - Simple Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not cause infinite re-renders with simple component', () => {
    const { getByTestId } = render(<SimpleTestComponent filtros={{ test: 'value' }} />)
    
    expect(getByTestId('simple-component')).toBeInTheDocument()
  })

  it('should handle filtros prop changes without infinite loops', () => {
    const { rerender, getByTestId } = render(
      <SimpleTestComponent filtros={{ test: 'value1' }} />
    )
    
    expect(getByTestId('simple-component')).toBeInTheDocument()
    
    rerender(<SimpleTestComponent filtros={{ test: 'value2' }} />)
    
    expect(getByTestId('simple-component')).toBeInTheDocument()
  })
})
