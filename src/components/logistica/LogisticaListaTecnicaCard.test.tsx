// ===================================================
// 📁 Archivo: LogisticaListaTecnicaCard.test.tsx
// 📌 Descripción: Tests para el componente LogisticaListaTecnicaCard
// 🧠 Uso: Verificar funcionalidad de props y renderizado
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LogisticaListaTecnicaCard from './LogisticaListaTecnicaCard'
import type { ListaEquipo } from '@/types'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

const mockPush = jest.fn()
;(useRouter as jest.Mock).mockReturnValue({
  push: mockPush
})

const mockLista: ListaEquipo & {
  resumen?: {
    totalItems: number
    cotizados: number
    respondidos: number
    pendientes: number
  }
} = {
  id: '1',
  codigo: 'LT-001',
  nombre: 'Lista Test',
  numeroSecuencia: 1,
  estado: 'borrador',
  proyectoId: 'proj-1',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  items: [],
  resumen: {
    totalItems: 10,
    cotizados: 5,
    respondidos: 3,
    pendientes: 7
  }
}

describe('LogisticaListaTecnicaCard', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders correctly with lista prop', () => {
    render(<LogisticaListaTecnicaCard lista={mockLista} />)
    
    expect(screen.getAllByText('Lista Test')).toHaveLength(2)
    expect(screen.getByText('borrador')).toBeInTheDocument()
  })

  it('accepts onRefresh prop without errors', () => {
    const mockOnRefresh = jest.fn()
    
    render(<LogisticaListaTecnicaCard lista={mockLista} onRefresh={mockOnRefresh} />)
    
    expect(screen.getAllByText('Lista Test')).toHaveLength(2)
  })

  it('handles lista without resumen', () => {
    const listaWithoutResumen: ListaEquipo & {
      resumen?: {
        totalItems: number
        cotizados: number
        respondidos: number
        pendientes: number
      }
    } = {
      ...mockLista,
      resumen: undefined
    }
    
    render(<LogisticaListaTecnicaCard lista={listaWithoutResumen} />)
    
    expect(screen.getAllByText('Lista Test')).toHaveLength(2)
  })

  it('displays correct status badge based on resumen', () => {
    // Test "Sin Cotizar" status (no cotizados)
    const listaWithoutCotizados: ListaEquipo & {
      resumen?: {
        totalItems: number
        cotizados: number
        respondidos: number
        pendientes: number
      }
    } = {
      ...mockLista,
      resumen: {
        totalItems: 10,
        cotizados: 0,
        respondidos: 0,
        pendientes: 10
      }
    }
    
    render(<LogisticaListaTecnicaCard lista={listaWithoutCotizados} />)
    expect(screen.getByText('Sin Cotizar')).toBeInTheDocument()
  })

  it('displays partial status when some items are cotizados', () => {
    const listaPartial: ListaEquipo & {
      resumen?: {
        totalItems: number
        cotizados: number
        respondidos: number
        pendientes: number
      }
    } = {
      ...mockLista,
      resumen: {
        totalItems: 10,
        cotizados: 5,
        respondidos: 3,
        pendientes: 7
      }
    }
    
    render(<LogisticaListaTecnicaCard lista={listaPartial} />)
    expect(screen.getByText('Parcial')).toBeInTheDocument()
  })

  it('displays responded status when all items are responded', () => {
    const listaCompleted: ListaEquipo & {
      resumen?: {
        totalItems: number
        cotizados: number
        respondidos: number
        pendientes: number
      }
    } = {
      ...mockLista,
      resumen: {
        totalItems: 10,
        cotizados: 10,
        respondidos: 10,
        pendientes: 0
      }
    }
    
    render(<LogisticaListaTecnicaCard lista={listaCompleted} />)
    expect(screen.getByText('Respondido')).toBeInTheDocument()
  })
})
