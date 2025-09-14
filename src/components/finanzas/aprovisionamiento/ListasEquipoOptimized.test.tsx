// ===================================================
// 📁 Archivo: ListasEquipoOptimized.test.tsx
// 📌 Ubicación: src/components/finanzas/aprovisionamiento/
// 🔧 Descripción: Tests para componente optimizado de listas de equipos
// 🧠 Uso: Testing de integración cache, debounce y paginación
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import ListasEquipoOptimized from './ListasEquipoOptimized'
import ListasEquipoService from '@/lib/services/listasEquipoOptimized'
import { ProyectosCache } from '@/lib/services/cacheService'

// 🔧 Mocks
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/services/listasEquipoOptimized')
jest.mock('@/lib/services/cacheService')
jest.mock('@/lib/hooks/useDebounceFilter', () => ({
  useSearchDebounce: (value: string, delay: number) => ({
    debouncedValue: value,
    isDebouncing: false
  })
}))

const mockListasEquipoService = ListasEquipoService as jest.Mocked<typeof ListasEquipoService>
const mockProyectosCache = ProyectosCache as jest.Mocked<typeof ProyectosCache>
const mockToast = toast as jest.Mocked<typeof toast>

// 📊 Mock data
const mockListasData = {
  data: [
    {
      id: '1',
      codigo: 'LE-001',
      nombre: 'Lista Equipos Proyecto Alpha',
      estado: 'borrador',
      itemsCount: 15,
      createdAt: '2025-01-15T10:00:00Z',
      proyecto: {
        id: 'proj-1',
        codigo: 'PROJ-001',
        nombre: 'Proyecto Alpha'
      }
    },
    {
      id: '2',
      codigo: 'LE-002',
      nombre: 'Lista Equipos Proyecto Beta',
      estado: 'aprobado',
      itemsCount: 8,
      createdAt: '2025-01-14T15:30:00Z',
      proyecto: {
        id: 'proj-2',
        codigo: 'PROJ-002',
        nombre: 'Proyecto Beta'
      }
    }
  ],
  meta: {
    page: 1,
    limit: 15,
    total: 2,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false
  }
}

const mockProyectos = [
  { id: 'proj-1', codigo: 'PROJ-001', nombre: 'Proyecto Alpha' },
  { id: 'proj-2', codigo: 'PROJ-002', nombre: 'Proyecto Beta' }
]

// 🔧 Test wrapper
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0
    }
  }
})

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const renderComponent = (props = {}) => {
  return render(
    <TestWrapper>
      <ListasEquipoOptimized {...props} />
    </TestWrapper>
  )
}

describe('ListasEquipoOptimized', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 📡 Setup default mocks
    mockListasEquipoService.getListas.mockResolvedValue(mockListasData)
    mockProyectosCache.getProyectosActivos.mockResolvedValue(mockProyectos)
  })

  describe('🔧 Rendering and Basic Functionality', () => {
    it('should render component with title and filters', async () => {
      renderComponent()
      
      expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar por código o nombre...')).toBeInTheDocument()
      expect(screen.getByText('Todos los estados')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
        expect(screen.getByText('Lista Equipos Proyecto Alpha')).toBeInTheDocument()
      })
    })

    it('should render in compact mode', () => {
      renderComponent({ compact: true })
      
      const title = screen.getByText('Listas de Equipos')
      expect(title).toHaveClass('text-lg')
    })

    it('should hide actions when showActions is false', () => {
      renderComponent({ showActions: false })
      
      expect(screen.queryByText('Nueva Lista')).not.toBeInTheDocument()
      expect(screen.queryByText('Ver Detalles')).not.toBeInTheDocument()
    })
  })

  describe('🔍 Search and Filtering', () => {
    it('should call service with search term', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o nombre...')
      await user.type(searchInput, 'Alpha')
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Alpha',
            page: 1
          })
        )
      })
    })

    it('should filter by estado', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      // Open select
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      // Select estado
      const borrador = screen.getByText('Borrador')
      await user.click(borrador)
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith(
          expect.objectContaining({
            estado: 'borrador',
            page: 1
          })
        )
      })
    })

    it('should reset page when searching', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o nombre...')
      await user.type(searchInput, 'test')
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        )
      })
    })
  })

  describe('📄 Pagination', () => {
    const mockPaginatedData = {
      ...mockListasData,
      meta: {
        page: 1,
        limit: 15,
        total: 50,
        totalPages: 4,
        hasPrevPage: false,
        hasNextPage: true
      }
    }

    it('should show pagination when multiple pages exist', async () => {
      mockListasEquipoService.getListas.mockResolvedValue(mockPaginatedData)
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('1 de 4')).toBeInTheDocument()
        expect(screen.getByText('Anterior')).toBeDisabled()
        expect(screen.getByText('Siguiente')).toBeEnabled()
      })
    })

    it('should handle page navigation', async () => {
      const user = userEvent.setup()
      mockListasEquipoService.getListas.mockResolvedValue(mockPaginatedData)
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Siguiente')).toBeInTheDocument()
      })
      
      const nextButton = screen.getByText('Siguiente')
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        )
      })
    })

    it('should show correct pagination info', async () => {
      mockListasEquipoService.getListas.mockResolvedValue(mockPaginatedData)
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Mostrando 1 a 15 de 50 listas')).toBeInTheDocument()
      })
    })
  })

  describe('🔄 Data Loading and Refresh', () => {
    it('should show loading skeleton initially', () => {
      mockListasEquipoService.getListas.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      renderComponent()
      
      // Should show multiple skeleton rows
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should handle refresh action', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
      })
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      await waitFor(() => {
        expect(mockListasEquipoService.invalidateCache).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Listas actualizadas')
      })
    })

    it('should handle refresh error', async () => {
      const user = userEvent.setup()
      mockListasEquipoService.getListas.mockRejectedValueOnce(new Error('Network error'))
      renderComponent()
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al actualizar listas')
      })
    })
  })

  describe('🚨 Error Handling', () => {
    it('should show error state when query fails', async () => {
      mockListasEquipoService.getListas.mockRejectedValue(new Error('API Error'))
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText(/Error al cargar listas/)).toBeInTheDocument()
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
    })

    it('should retry on error button click', async () => {
      const user = userEvent.setup()
      mockListasEquipoService.getListas
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockListasData)
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Reintentar')
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
      })
    })
  })

  describe('📊 Data Display', () => {
    it('should display lista data correctly', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
        expect(screen.getByText('Lista Equipos Proyecto Alpha')).toBeInTheDocument()
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
        expect(screen.getByText('PROJ-001')).toBeInTheDocument()
        expect(screen.getByText('15 items')).toBeInTheDocument()
      })
    })

    it('should show correct estado badges', async () => {
      renderComponent()
      
      await waitFor(() => {
        const borradorBadge = screen.getByText('Borrador')
        const aprobadoBadge = screen.getByText('Aprobado')
        
        expect(borradorBadge).toBeInTheDocument()
        expect(aprobadoBadge).toBeInTheDocument()
      })
    })

    it('should show empty state when no data', async () => {
      mockListasEquipoService.getListas.mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 0,
          hasPrevPage: false,
          hasNextPage: false
        }
      })
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('No hay listas de equipos disponibles')).toBeInTheDocument()
      })
    })

    it('should show search empty state', async () => {
      const user = userEvent.setup()
      mockListasEquipoService.getListas.mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 0,
          hasPrevPage: false,
          hasNextPage: false
        }
      })
      
      renderComponent()
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o nombre...')
      await user.type(searchInput, 'nonexistent')
      
      await waitFor(() => {
        expect(screen.getByText('No se encontraron listas que coincidan con "nonexistent"')).toBeInTheDocument()
      })
    })
  })

  describe('🔧 Interactions', () => {
    it('should call onListaSelect when row is clicked', async () => {
      const user = userEvent.setup()
      const mockOnSelect = jest.fn()
      renderComponent({ onListaSelect: mockOnSelect })
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
      })
      
      const row = screen.getByText('LE-001').closest('tr')
      await user.click(row!)
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          codigo: 'LE-001'
        })
      )
    })

    it('should not make rows clickable when onListaSelect is not provided', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('LE-001')).toBeInTheDocument()
      })
      
      const row = screen.getByText('LE-001').closest('tr')
      expect(row).not.toHaveClass('cursor-pointer')
    })
  })

  describe('🔧 Service Integration', () => {
    it('should call service with correct filters', async () => {
      renderComponent({ proyectoId: 'proj-1' })
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith({
          page: 1,
          limit: 15,
          search: '',
          estado: undefined,
          proyectoId: 'proj-1',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
      })
    })

    it('should use compact page size', async () => {
      renderComponent({ compact: true })
      
      await waitFor(() => {
        expect(mockListasEquipoService.getListas).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 10 })
        )
      })
    })
  })
})