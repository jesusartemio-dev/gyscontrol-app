/**
 * @fileoverview Tests para las nuevas funcionalidades de pedidos en ListaEquipoItemList
 * @author GYS Team
 * @date 2025-01-15
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import ListaEquipoItemList from '../ListaEquipoItemList'
import { ListaEquipoItem, PedidoEquipoItem } from '@/types'

// 🧪 Mock the helper functions
jest.mock('@/lib/utils/pedidoHelpers', () => ({
  calcularResumenPedidos: jest.fn(),
  getBadgeVariantPorEstado: jest.fn(),
  getTextoPorEstado: jest.fn(),
  getClasesFilaPorEstado: jest.fn(),
  getInfoPedidosParaTooltip: jest.fn(),
  tienePedidosActivos: jest.fn(),
  estaDisponible: jest.fn()
}))

// 🧪 Mock the services
jest.mock('@/lib/services/listaEquipoItem', () => ({
  updateListaEquipoItem: jest.fn()
}))

// 🧪 Mock data
const mockPedidoItem: PedidoEquipoItem = {
  id: 'pedido-1',
  pedidoId: 'ped-1',
  listaId: 'lista-1',
  listaEquipoItemId: 'item-1',
  cantidadPedida: 10,
  cantidadAtendida: 5,
  precioUnitario: 100,
  costoTotal: 1000,
  estado: 'parcial',
  comentarioLogistica: 'Pedido parcial',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockItemConPedidos: ListaEquipoItem = {
  id: 'item-1',
  listaId: 'lista-1',
  equipoId: 'equipo-1',
  codigo: 'EQ001',
  descripcion: 'Equipo con pedidos',
  unidad: 'pza',
  cantidad: 20,
  cotizacion: 150,
  costo: 3000,
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  origen: 'nacional',
  estado: 'aprobado',
  verificado: true,
  comentario: 'Item con pedidos activos',
  createdAt: new Date(),
  updatedAt: new Date(),
  pedidos: [mockPedidoItem]
}

const mockItemSinPedidos: ListaEquipoItem = {
  ...mockItemConPedidos,
  id: 'item-2',
  descripcion: 'Equipo sin pedidos',
  comentario: 'Item disponible',
  pedidos: []
}

const mockItems: ListaEquipoItem[] = [mockItemConPedidos, mockItemSinPedidos]

// 🧪 Mock implementations
const mockHelpers = {
  calcularResumenPedidos: jest.fn(),
  getBadgeVariantPorEstado: jest.fn(),
  getTextoPorEstado: jest.fn(),
  getClasesFilaPorEstado: jest.fn(),
  getInfoPedidosParaTooltip: jest.fn(),
  tienePedidosActivos: jest.fn(),
  estaDisponible: jest.fn()
}

const defaultProps = {
  items: mockItems,
  isLoading: false,
  onItemUpdate: jest.fn(),
  onItemSelect: jest.fn(),
  selectedItems: [],
  showSelectionColumn: false,
  showEquipoColumn: false,
  compactMode: false
}

describe('ListaEquipoItemList - Pedidos Functionality', () => {
  beforeEach(() => {
    // ✅ Reset all mocks
    jest.clearAllMocks()
    
    // ✅ Setup default mock implementations
    mockHelpers.calcularResumenPedidos.mockImplementation((pedidos) => {
      if (!pedidos || pedidos.length === 0) {
        return {
          estado: 'disponible',
          totalPedidos: 0,
          cantidadTotalPedida: 0,
          cantidadTotalAtendida: 0,
          pedidosActivos: 0,
          pedidosCompletos: 0,
          pedidosParciales: 0
        }
      }
      return {
        estado: 'parcial',
        totalPedidos: 1,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 5,
        pedidosActivos: 1,
        pedidosCompletos: 0,
        pedidosParciales: 1
      }
    })
    
    mockHelpers.getBadgeVariantPorEstado.mockImplementation((estado) => {
      const variants = {
        'disponible': 'outline',
        'en_pedido': 'secondary',
        'parcial': 'default',
        'completo': 'default'
      }
      return variants[estado] || 'outline'
    })
    
    mockHelpers.getTextoPorEstado.mockImplementation((estado) => {
      const textos = {
        'disponible': 'Disponible',
        'en_pedido': 'En Pedido',
        'parcial': 'Parcial',
        'completo': 'Completo'
      }
      return textos[estado] || 'Desconocido'
    })
    
    mockHelpers.getClasesFilaPorEstado.mockImplementation((estado) => {
      const clases = {
        'disponible': '',
        'en_pedido': 'border-l-4 border-l-blue-400 bg-blue-50/30',
        'parcial': 'border-l-4 border-l-yellow-400 bg-yellow-50/30',
        'completo': 'border-l-4 border-l-green-400 bg-green-50/30'
      }
      return clases[estado] || ''
    })
    
    mockHelpers.getInfoPedidosParaTooltip.mockImplementation((resumen) => {
      if (resumen.estado === 'disponible') return []
      return [
        `Pedidos activos: ${resumen.pedidosActivos}`,
        `Cantidad pedida: ${resumen.cantidadTotalPedida}`,
        `Cantidad atendida: ${resumen.cantidadTotalAtendida}`
      ]
    })
    
    mockHelpers.tienePedidosActivos.mockImplementation((pedidos) => {
      return pedidos && pedidos.length > 0
    })
    
    mockHelpers.estaDisponible.mockImplementation((pedidos) => {
      return !pedidos || pedidos.length === 0
    })
  })

  describe('Pedidos Column Display', () => {
    it('should render Pedidos column header when visible', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      expect(screen.getByText('Pedidos')).toBeInTheDocument()
    })

    it('should display correct badge for item with pedidos', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Should show "Parcial" badge for item with partial pedidos
      expect(screen.getByText('Parcial')).toBeInTheDocument()
    })

    it('should display correct badge for item without pedidos', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Should show "Disponible" badge for item without pedidos
      expect(screen.getByText('Disponible')).toBeInTheDocument()
    })

    it('should apply correct CSS classes to rows based on pedido status', () => {
      const { container } = render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Find rows and check for applied classes
      const rows = container.querySelectorAll('tbody tr')
      expect(rows).toHaveLength(2)
      
      // ✅ First row should have parcial classes
      expect(rows[0]).toHaveClass('border-l-4', 'border-l-yellow-400', 'bg-yellow-50/30')
      
      // ✅ Second row should have no special classes (disponible)
      expect(rows[1]).not.toHaveClass('border-l-4')
    })
  })

  describe('Pedidos Filters', () => {
    it('should render pedido status filter buttons', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Check for filter buttons
      expect(screen.getByText('Todos')).toBeInTheDocument()
      expect(screen.getByText('Disponible')).toBeInTheDocument()
      expect(screen.getByText('En Pedido')).toBeInTheDocument()
      expect(screen.getByText('Parcial')).toBeInTheDocument()
      expect(screen.getByText('Completo')).toBeInTheDocument()
    })

    it('should filter items by disponible status', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Click on "Disponible" filter
      const disponibleButton = screen.getByRole('button', { name: /disponible/i })
      fireEvent.click(disponibleButton)
      
      await waitFor(() => {
        // ✅ Should only show items without pedidos
        expect(screen.getByText('Equipo sin pedidos')).toBeInTheDocument()
        expect(screen.queryByText('Equipo con pedidos')).not.toBeInTheDocument()
      })
    })

    it('should filter items by parcial status', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Click on "Parcial" filter
      const parcialButton = screen.getByRole('button', { name: /parcial/i })
      fireEvent.click(parcialButton)
      
      await waitFor(() => {
        // ✅ Should only show items with partial pedidos
        expect(screen.getByText('Equipo con pedidos')).toBeInTheDocument()
        expect(screen.queryByText('Equipo sin pedidos')).not.toBeInTheDocument()
      })
    })

    it('should show all items when "Todos" filter is selected', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ First filter by disponible
      const disponibleButton = screen.getByRole('button', { name: /disponible/i })
      fireEvent.click(disponibleButton)
      
      // ✅ Then click "Todos" to reset filter
      const todosButton = screen.getByRole('button', { name: /todos/i })
      fireEvent.click(todosButton)
      
      await waitFor(() => {
        // ✅ Should show both items
        expect(screen.getByText('Equipo con pedidos')).toBeInTheDocument()
        expect(screen.getByText('Equipo sin pedidos')).toBeInTheDocument()
      })
    })
  })

  describe('Column Visibility', () => {
    it('should show pedidos column by default', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      expect(screen.getByText('Pedidos')).toBeInTheDocument()
    })

    it('should hide pedidos column when toggled off', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Find and click column visibility toggle (assuming it exists)
      const columnToggle = screen.getByRole('button', { name: /columnas/i })
      fireEvent.click(columnToggle)
      
      // ✅ Find and uncheck pedidos column
      const pedidosCheckbox = screen.getByRole('checkbox', { name: /pedidos/i })
      fireEvent.click(pedidosCheckbox)
      
      await waitFor(() => {
        expect(screen.queryByText('Pedidos')).not.toBeInTheDocument()
      })
    })
  })

  describe('Tooltip Information', () => {
    it('should show tooltip with pedido details on hover', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Find the badge with pedido information
      const parcialBadge = screen.getByText('Parcial')
      
      // ✅ Hover over the badge
      fireEvent.mouseEnter(parcialBadge)
      
      await waitFor(() => {
        // ✅ Should show tooltip with pedido details
        expect(screen.getByText('Pedidos activos: 1')).toBeInTheDocument()
        expect(screen.getByText('Cantidad pedida: 10')).toBeInTheDocument()
        expect(screen.getByText('Cantidad atendida: 5')).toBeInTheDocument()
      })
    })

    it('should not show tooltip for disponible items', async () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Find the disponible badge
      const disponibleBadge = screen.getByText('Disponible')
      
      // ✅ Hover over the badge
      fireEvent.mouseEnter(disponibleBadge)
      
      await waitFor(() => {
        // ✅ Should not show tooltip for disponible items
        expect(screen.queryByText('Pedidos activos:')).not.toBeInTheDocument()
      })
    })
  })

  describe('Integration with Helper Functions', () => {
    it('should call calcularResumenPedidos for each item', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Should be called for each item
      expect(mockHelpers.calcularResumenPedidos).toHaveBeenCalledTimes(2)
      expect(mockHelpers.calcularResumenPedidos).toHaveBeenCalledWith([mockPedidoItem])
      expect(mockHelpers.calcularResumenPedidos).toHaveBeenCalledWith([])
    })

    it('should call getClasesFilaPorEstado for row styling', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Should be called for each item to get row classes
      expect(mockHelpers.getClasesFilaPorEstado).toHaveBeenCalledWith('parcial')
      expect(mockHelpers.getClasesFilaPorEstado).toHaveBeenCalledWith('disponible')
    })

    it('should call getBadgeVariantPorEstado and getTextoPorEstado for badge display', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Should be called for badge styling and text
      expect(mockHelpers.getBadgeVariantPorEstado).toHaveBeenCalledWith('parcial')
      expect(mockHelpers.getBadgeVariantPorEstado).toHaveBeenCalledWith('disponible')
      expect(mockHelpers.getTextoPorEstado).toHaveBeenCalledWith('parcial')
      expect(mockHelpers.getTextoPorEstado).toHaveBeenCalledWith('disponible')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle items with undefined pedidos', () => {
      const itemsWithUndefined = [
        { ...mockItemSinPedidos, pedidos: undefined }
      ]
      
      expect(() => {
        render(<ListaEquipoItemList {...defaultProps} items={itemsWithUndefined} />)
      }).not.toThrow()
    })

    it('should handle empty items array', () => {
      render(<ListaEquipoItemList {...defaultProps} items={[]} />)
      
      // ✅ Should show empty state
      expect(screen.getByText(/no hay items/i)).toBeInTheDocument()
    })

    it('should handle loading state', () => {
      render(<ListaEquipoItemList {...defaultProps} isLoading={true} />)
      
      // ✅ Should show loading skeleton
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })
})
