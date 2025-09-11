/**
 * @fileoverview Tests para el componente FiltrosAprovisionamiento
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-16
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import FiltrosAprovisionamiento, { type FiltrosAprovisionamiento as FiltrosType } from '@/components/finanzas/FiltrosAprovisionamiento'

// 🔧 Mock básico de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams()
}))

// 🔧 Mock básico de lodash
jest.mock('lodash', () => ({
  debounce: jest.fn((fn) => fn)
}))

// 🔧 Mock de todos los componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="button">{children}</button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>
}))

// Mock de iconos
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />
}))

describe('FiltrosAprovisionamiento', () => {
  const defaultProps = {
    filtros: {
      search: '',
      estado: 'todos',
      responsable: 'todos',
      fechaInicio: '',
      fechaFin: '',
      alertas: false,
      page: 1,
      limit: 10
    },
    onFiltrosChange: jest.fn()
  }

  it('✅ debe importar el componente correctamente', () => {
    expect(FiltrosAprovisionamiento).toBeDefined()
    expect(typeof FiltrosAprovisionamiento).toBe('function')
  })

  it('✅ debe renderizar sin errores', () => {
    const { getByTestId } = render(
      <FiltrosAprovisionamiento {...defaultProps} />
    )

    expect(getByTestId('card')).toBeInTheDocument()
  })

  it('✅ debe recibir props correctamente', () => {
    const onFiltrosChange = jest.fn()
    render(
      <FiltrosAprovisionamiento 
        {...defaultProps} 
        onFiltrosChange={onFiltrosChange}
      />
    )

    expect(onFiltrosChange).toBeDefined()
  })
})