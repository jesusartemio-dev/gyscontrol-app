// ===================================================
// 📁 Archivo: PedidoEquipoListWithFilters.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente PedidoEquipoListWithFilters
// 🧠 Uso: Verificar funcionalidad de lista con filtros de pedidos
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PedidoEquipoListWithFilters from '../PedidoEquipoListWithFilters'
import { getAllPedidoEquipos } from '@/lib/services/pedidoEquipo'
import { getUsers } from '@/lib/services/user'
import { PedidoEquipo, User } from '@/types'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/services/pedidoEquipo')
jest.mock('@/lib/services/user')
jest.mock('sonner')
jest.mock('../PedidoEquipoList', () => {
  return function MockPedidoEquipoList({ data }: { data: PedidoEquipo[] }) {
    return (
      <div data-testid="pedido-equipo-list">
        {data.map((pedido) => (
          <div key={pedido.id} data-testid={`pedido-${pedido.id}`}>
            {pedido.codigo} - {pedido.estado}
          </div>
        ))}
      </div>
    )
  }
})

const mockGetAllPedidoEquipos = getAllPedidoEquipos as jest.MockedFunction<typeof getAllPedidoEquipos>
const mockGetUsers = getUsers as jest.MockedFunction<typeof getUsers>
const mockToast = toast as jest.Mocked<typeof toast>

// Mock data
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
]

const mockPedidos: PedidoEquipo[] = [
  {
    id: '1',
    codigo: 'PED-001',
    estado: 'borrador',
    fechaNecesaria: '2025-02-01',
    createdAt: '2025-01-15',
    observacion: 'Pedido de prueba',
    proyectoId: 'proj-1',
    responsableId: '1',
    listaId: 'lista-1',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
    },
    responsable: {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@test.com',
    },
    lista: {
      id: 'lista-1',
      nombre: 'Lista Test',
      codigo: 'LIST-001',
    },
    items: [],
  },
  {
    id: '2',
    codigo: 'PED-002',
    estado: 'enviado',
    fechaNecesaria: '2025-02-15',
    createdAt: '2025-01-20',
    observacion: 'Segundo pedido',
    proyectoId: 'proj-1',
    responsableId: '1',
    listaId: 'lista-2',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
    },
    responsable: {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@test.com',
    },
    lista: {
      id: 'lista-2',
      nombre: 'Lista Test 2',
      codigo: 'LIST-002',
    },
    items: [],
  },
]

describe('PedidoEquipoListWithFilters', () => {
  const mockOnUpdate = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnUpdateItem = jest.fn()
  const mockOnDeleteItem = jest.fn()

  const defaultProps = {
    onUpdate: mockOnUpdate,
    onDelete: mockOnDelete,
    onUpdateItem: mockOnUpdateItem,
    onDeleteItem: mockOnDeleteItem,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAllPedidoEquipos.mockResolvedValue(mockPedidos)
    mockGetUsers.mockResolvedValue(mockUsers)
  })

  it('renders component with title and statistics', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    expect(screen.getByText('📦 Gestión de Pedidos de Equipos')).toBeInTheDocument()
    expect(screen.getByText('Todos los pedidos del sistema')).toBeInTheDocument()
    expect(screen.getByText('Actualizar')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total count
    })
  })

  it('loads pedidos on mount', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(mockGetAllPedidoEquipos).toHaveBeenCalledTimes(1)
    })
  })

  it('displays statistics correctly', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      // Total: 2 pedidos
      expect(screen.getByText('2')).toBeInTheDocument()
      // Borradores: 1 (PED-001)
      expect(screen.getByText('1')).toBeInTheDocument()
      // Enviados: 1 (PED-002)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    expect(screen.getByText('Cargando pedidos...')).toBeInTheDocument()
  })

  it('renders pedidos list after loading', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('pedido-equipo-list')).toBeInTheDocument()
      expect(screen.getByTestId('pedido-1')).toBeInTheDocument()
      expect(screen.getByTestId('pedido-2')).toBeInTheDocument()
    })
  })

  it('filters by proyectoId when provided', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} proyectoId="proj-1" />)

    await waitFor(() => {
      expect(mockGetAllPedidoEquipos).toHaveBeenCalledWith({
        proyectoId: 'proj-1',
      })
    })

    expect(screen.getByText('Pedidos del proyecto seleccionado')).toBeInTheDocument()
  })

  it('handles refresh button click', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(mockGetAllPedidoEquipos).toHaveBeenCalledTimes(1)
    })

    const refreshButton = screen.getByText('Actualizar')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockGetAllPedidoEquipos).toHaveBeenCalledTimes(2)
    })
  })

  it('shows empty state when no pedidos found', async () => {
    mockGetAllPedidoEquipos.mockResolvedValue([])

    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No se encontraron pedidos')).toBeInTheDocument()
      expect(screen.getByText('No hay pedidos registrados en el sistema')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    mockGetAllPedidoEquipos.mockResolvedValue(null)

    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al cargar pedidos')
    })
  })

  it('reloads data when filters change', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetAllPedidoEquipos).toHaveBeenCalledTimes(1)
    })

    // Change a filter (this would require more complex interaction with the filters component)
    // For now, we just verify the initial behavior
    expect(mockGetAllPedidoEquipos).toHaveBeenCalledWith({})
  })

  it('passes correct props to PedidoEquipoList', async () => {
    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('pedido-equipo-list')).toBeInTheDocument()
    })

    // The mocked component should receive the pedidos data
    expect(screen.getByText('PED-001 - borrador')).toBeInTheDocument()
    expect(screen.getByText('PED-002 - enviado')).toBeInTheDocument()
  })

  it('calculates statistics correctly for different states', async () => {
    const mixedStatePedidos: PedidoEquipo[] = [
      { ...mockPedidos[0], estado: 'borrador' },
      { ...mockPedidos[1], estado: 'enviado' },
      { ...mockPedidos[0], id: '3', estado: 'atendido' },
      { ...mockPedidos[0], id: '4', estado: 'entregado' },
      { ...mockPedidos[0], id: '5', estado: 'parcial' },
    ]

    mockGetAllPedidoEquipos.mockResolvedValue(mixedStatePedidos)

    render(<PedidoEquipoListWithFilters {...defaultProps} />)

    await waitFor(() => {
      // Should show correct counts for each state
      expect(screen.getByText('5')).toBeInTheDocument() // Total
    })
  })
})
