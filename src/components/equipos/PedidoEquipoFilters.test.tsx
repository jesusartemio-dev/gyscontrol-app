// ===================================================
// 📁 Archivo: PedidoEquipoFilters.test.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Tests para el componente PedidoEquipoFilters con filtros de fecha OC
// ✍️ Autor: Jesús Artemio (GYS) + IA GYS
// 📅 Última actualización: 2025-01-01
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PedidoEquipoFilters, { defaultFilters, PedidoEquipoFiltersState } from './PedidoEquipoFilters'
import { getUsers } from '@/lib/services/user'

// Mock the services
jest.mock('@/lib/services/user')
const mockGetUsers = getUsers as jest.MockedFunction<typeof getUsers>

const mockUsers = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@test.com',
    password: 'password123',
    role: 'logistico' as const,
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
    password: 'password456',
    role: 'logistico' as const,
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUsers.mockResolvedValue(mockUsers)
  })

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: mockOnFiltersChange,
    onClearFilters: mockOnClearFilters,
  }

  it('renders basic filters correctly', () => {
    render(<PedidoEquipoFilters {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Buscar por código, observación...')).toBeInTheDocument()
    expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    expect(screen.getByText('Todos los responsables')).toBeInTheDocument()
  })

  it('shows advanced filters when "Más filtros" is clicked', async () => {
    render(<PedidoEquipoFilters {...defaultProps} />)
    
    const moreFiltersButton = screen.getByText('Más filtros')
    fireEvent.click(moreFiltersButton)
    
    await waitFor(() => {
      expect(screen.getByText('Fecha desde')).toBeInTheDocument()
      expect(screen.getByText('Fecha hasta')).toBeInTheDocument()
      expect(screen.getByText('Filtros por Fecha OC Recomendada')).toBeInTheDocument()
    })
  })

  it('renders OC date filters in advanced section', async () => {
    render(<PedidoEquipoFilters {...defaultProps} />)
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Más filtros'))
    
    await waitFor(() => {
      expect(screen.getByText('F. OC desde')).toBeInTheDocument()
      expect(screen.getByText('F. OC hasta')).toBeInTheDocument()
      expect(screen.getByText('Solo mostrar OC vencidas (fecha pasada)')).toBeInTheDocument()
    })
  })

  it('handles OC date filter changes', async () => {
    const user = userEvent.setup()
    render(<PedidoEquipoFilters {...defaultProps} />)
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Más filtros'))
    
    await waitFor(() => {
      const fechaOCDesdeInput = screen.getByLabelText('F. OC desde')
      expect(fechaOCDesdeInput).toBeInTheDocument()
    })

    const fechaOCDesdeInput = screen.getByLabelText('F. OC desde')
    await user.type(fechaOCDesdeInput, '2024-01-01')
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      fechaOCDesde: '2024-01-01'
    })
  })

  it('handles "solo vencidas" checkbox', async () => {
    const user = userEvent.setup()
    render(<PedidoEquipoFilters {...defaultProps} />)
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Más filtros'))
    
    await waitFor(() => {
      const checkbox = screen.getByLabelText('Solo mostrar OC vencidas (fecha pasada)')
      expect(checkbox).toBeInTheDocument()
    })

    const checkbox = screen.getByLabelText('Solo mostrar OC vencidas (fecha pasada)')
    await user.click(checkbox)
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      soloVencidas: true
    })
  })

  it('shows active filter tags for OC filters', () => {
    const filtersWithOC: PedidoEquipoFiltersState = {
      ...defaultFilters,
      fechaOCDesde: '2024-01-01',
      fechaOCHasta: '2024-12-31',
      soloVencidas: true,
    }

    render(
      <PedidoEquipoFilters
        {...defaultProps}
        filters={filtersWithOC}
      />
    )
    
    expect(screen.getByText('F. OC desde: 2024-01-01')).toBeInTheDocument()
    expect(screen.getByText('F. OC hasta: 2024-12-31')).toBeInTheDocument()
    expect(screen.getByText('Solo OC vencidas')).toBeInTheDocument()
  })

  it('calls onClearFilters when clear button is clicked', () => {
    const filtersWithData: PedidoEquipoFiltersState = {
      ...defaultFilters,
      searchText: 'test',
      fechaOCDesde: '2024-01-01',
    }

    render(
      <PedidoEquipoFilters
        {...defaultProps}
        filters={filtersWithData}
      />
    )
    
    const clearButton = screen.getByText('Limpiar')
    fireEvent.click(clearButton)
    
    expect(mockOnClearFilters).toHaveBeenCalled()
  })

  it('has correct default values for new OC filters', () => {
    expect(defaultFilters.fechaOCDesde).toBe('')
    expect(defaultFilters.fechaOCHasta).toBe('')
    expect(defaultFilters.soloVencidas).toBe(false)
  })
})
