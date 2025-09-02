// ===================================================
// 📁 Archivo: LogisticaListasFilters.test.tsx
// 📌 Descripción: Tests para el componente LogisticaListasFilters
// 🧠 Uso: Verificar funcionalidad de filtros avanzados
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LogisticaListasFilters from '../LogisticaListasFilters'
import type { Proyecto, ListaEquipo } from '@/types'

// Mock data
const mockProyectos: Proyecto[] = [
  {
    id: '1',
    codigo: 'PROJ-001',
    nombre: 'Proyecto Test 1',
    descripcion: 'Descripción del proyecto test',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'activo',
    clienteId: 'client-1',
    responsableId: 'user-1',
    presupuesto: 100000,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockListas: ListaEquipo[] = [
  {
    id: '1',
    codigo: 'LISTA-001',
    nombre: 'Lista Test 1',
    numeroSecuencia: 1,
    estado: 'borrador',
    proyectoId: '1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    items: []
  },
  {
    id: '2',
    codigo: 'LISTA-002',
    nombre: 'Lista Test 2',
    numeroSecuencia: 2,
    estado: 'aprobado',
    proyectoId: '1',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    items: []
  }
]

const mockOnFiltersChange = jest.fn()

describe('LogisticaListasFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with props', () => {
    render(
      <LogisticaListasFilters
        proyectos={mockProyectos}
        listas={mockListas}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByPlaceholderText(/buscar listas/i)).toBeInTheDocument()
    expect(screen.getByText(/filtros avanzados/i)).toBeInTheDocument()
  })

  it('handles search input correctly', async () => {
    render(
      <LogisticaListasFilters
        proyectos={mockProyectos}
        listas={mockListas}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByPlaceholderText(/buscar listas/i)
    fireEvent.change(searchInput, { target: { value: 'Lista Test 1' } })

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalled()
    })
  })

  it('filters listas correctly by search term', async () => {
    render(
      <LogisticaListasFilters
        proyectos={mockProyectos}
        listas={mockListas}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByPlaceholderText(/buscar listas/i)
    fireEvent.change(searchInput, { target: { value: 'Lista Test 1' } })

    await waitFor(() => {
      const lastCall = mockOnFiltersChange.mock.calls[mockOnFiltersChange.mock.calls.length - 1]
      expect(lastCall[0]).toHaveLength(1)
      expect(lastCall[0][0].nombre).toBe('Lista Test 1')
    })
  })

  it('handles empty arrays gracefully', () => {
    render(
      <LogisticaListasFilters
        proyectos={[]}
        listas={[]}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByPlaceholderText(/buscar listas/i)).toBeInTheDocument()
  })

  it('handles undefined arrays gracefully', () => {
    render(
      <LogisticaListasFilters
        proyectos={mockProyectos}
        listas={undefined as any}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByPlaceholderText(/buscar listas/i)).toBeInTheDocument()
  })
})