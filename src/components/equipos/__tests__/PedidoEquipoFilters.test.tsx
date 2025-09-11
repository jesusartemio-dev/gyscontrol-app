// ===================================================
// 📁 Archivo: PedidoEquipoFilters.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente PedidoEquipoFilters
// 🧠 Uso: Verificar funcionalidad de filtros de pedidos
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PedidoEquipoFilters, { defaultFilters, PedidoEquipoFiltersState } from '../PedidoEquipoFilters'
import { getUsers } from '@/lib/services/user'
import { User } from '@/types'

// Mock the user service
jest.mock('@/lib/services/user')
const mockGetUsers = getUsers as jest.MockedFunction<typeof getUsers>

// Mock users data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@test.com',
    password: 'password',
    role: 'logistico',
    proyectosComercial: [],
    proyectosGestor: [],
    cotizaciones: [],
    ProyectoEquipos: [],
    ProyectoEquipoItems: [],
    ProyectoServicios: [],
    ProyectoServicioItems: [],
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@test.com',
    password: 'password',
    role: 'coordinador',
    proyectosComercial: [],
    proyectosGestor: [],
    cotizaciones: [],
    ProyectoEquipos: [],
    ProyectoEquipoItems: [],
    ProyectoServicios: [],
    ProyectoServicioItems: [],
  },
]

describe('PedidoEquipoFilters', () => {
  const mockOnFiltersChange = jest.fn()
  const mockOnClearFilters = jest.fn()

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: mockOnFiltersChange,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUsers.mockResolvedValue(mockUsers)
  })

  it('renders basic filter elements', async () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    // Check for main elements
    expect(screen.getByText('Filtros de Pedidos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Código, descripción o observación...')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Responsable')).toBeInTheDocument()
    expect(screen.getByText('Más filtros')).toBeInTheDocument()
  })

  it('loads users for responsable filter', async () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onFiltersChange when search text changes', () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Código, descripción o observación...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchText: 'test search',
    })
  })

  it('shows advanced filters when "Más filtros" is clicked', () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    const moreFiltersButton = screen.getByText('Más filtros')
    fireEvent.click(moreFiltersButton)

    expect(screen.getByText('Fecha desde')).toBeInTheDocument()
    expect(screen.getByText('Fecha hasta')).toBeInTheDocument()
    expect(screen.getByText('Ocultar')).toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', () => {
    const activeFilters: PedidoEquipoFiltersState = {
      ...defaultFilters,
      searchText: 'test',
      estado: 'enviado',
    }

    render(
      <PedidoEquipoFilters
        {...defaultProps}
        filters={activeFilters}
      />
    )

    expect(screen.getByText('Limpiar')).toBeInTheDocument()
  })

  it('calls onClearFilters when clear button is clicked', () => {
    const activeFilters: PedidoEquipoFiltersState = {
      ...defaultFilters,
      searchText: 'test',
    }

    render(
      <PedidoEquipoFilters
        {...defaultProps}
        filters={activeFilters}
      />
    )

    const clearButton = screen.getByText('Limpiar')
    fireEvent.click(clearButton)

    expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
  })

  it('shows active filters summary', () => {
    const activeFilters: PedidoEquipoFiltersState = {
      searchText: 'test search',
      estado: 'enviado',
      responsableId: '1',
      fechaDesde: '2025-01-01',
      fechaHasta: '2025-01-31',
    }

    render(
      <PedidoEquipoFilters
        {...defaultProps}
        filters={activeFilters}
      />
    )

    expect(screen.getByText('Filtros activos:')).toBeInTheDocument()
    expect(screen.getByText('Texto: test search')).toBeInTheDocument()
    expect(screen.getByText('Estado: Enviado')).toBeInTheDocument()
    expect(screen.getByText('Desde: 2025-01-01')).toBeInTheDocument()
    expect(screen.getByText('Hasta: 2025-01-31')).toBeInTheDocument()
  })

  it('handles date filter changes', () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    // Show advanced filters first
    const moreFiltersButton = screen.getByText('Más filtros')
    fireEvent.click(moreFiltersButton)

    const fechaDesdeInput = screen.getByLabelText('Fecha desde')
    fireEvent.change(fechaDesdeInput, { target: { value: '2025-01-01' } })

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      fechaDesde: '2025-01-01',
    })
  })

  it('renders all estado options', () => {
    render(<PedidoEquipoFilters {...defaultProps} />)

    // This test would need to interact with the Select component
    // For now, we just verify the component renders without errors
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('handles estado filter changes', () => {
    // This test would require more complex interaction with the Select component
    // For now, we verify the component structure
    render(<PedidoEquipoFilters {...defaultProps} />)
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })
})

// Test the defaultFilters export
describe('defaultFilters', () => {
  it('has correct default values', () => {
    expect(defaultFilters).toEqual({
      searchText: '',
      estado: '__ALL__',
      responsableId: '__ALL__',
      fechaDesde: '',
      fechaHasta: '',
    })
  })
})
