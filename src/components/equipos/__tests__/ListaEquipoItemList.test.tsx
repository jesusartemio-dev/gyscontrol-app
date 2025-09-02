// ===================================================
// 📁 Archivo: ListaEquipoItemList.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para ListaEquipoItemList component
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import ListaEquipoItemList from '../ListaEquipoItemList'
import type { ListaEquipoItem } from '@/types'

// 🎭 Mock dependencies
jest.mock('../../../lib/utils/costoCalculations', () => ({
  calcularCostoItem: jest.fn(),
  calcularCostoTotal: jest.fn(),
  formatCurrency: jest.fn()
}))

jest.mock('../../../lib/services/listaEquipoItem', () => ({
  updateListaEquipoItem: jest.fn(),
  deleteListaEquipoItem: jest.fn()
}))

// 🧪 Mock data
const mockItems: ListaEquipoItem[] = [
  {
    id: '1',
    codigo: 'EQ001',
    descripcion: 'Equipo Test 1',
    unidad: 'pza',
    cantidad: 2,
    costoElegido: 500.00,
    cotizacionSeleccionada: {
      id: 'cot1',
      precioUnitario: 200.00,
      moneda: 'USD',
      proveedor: 'Proveedor A',
      tiempoEntrega: '15 días'
    },
    estado: 'aprobado',
    origen: 'cotizado',
    verificado: true,
    listaId: 'lista1',
    catalogoEquipoId: 'cat1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    codigo: 'EQ002',
    descripcion: 'Equipo Test 2',
    unidad: 'pza',
    cantidad: 1,
    costoElegido: null,
    cotizacionSeleccionada: {
      id: 'cot2',
      precioUnitario: 300.00,
      moneda: 'USD',
      proveedor: 'Proveedor B',
      tiempoEntrega: '10 días'
    },
    estado: 'pendiente',
    origen: 'cotizado',
    verificado: false,
    listaId: 'lista1',
    catalogoEquipoId: 'cat2',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    codigo: 'EQ003',
    descripcion: 'Equipo Test 3',
    unidad: 'pza',
    cantidad: 3,
    costoElegido: null,
    cotizacionSeleccionada: null,
    estado: 'pendiente',
    origen: 'nuevo',
    verificado: false,
    listaId: 'lista1',
    catalogoEquipoId: 'cat3',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
]

const defaultProps = {
  items: mockItems,
  onItemUpdate: jest.fn(),
  onItemDelete: jest.fn(),
  isLoading: false,
  canEdit: true,
  canDelete: true,
  showActions: true
}

// 🎭 Setup mocks
const { calcularCostoItem, calcularCostoTotal, formatCurrency } = require('../../../lib/utils/costoCalculations')

beforeEach(() => {
  jest.clearAllMocks()
  
  // Mock implementations
  calcularCostoItem.mockImplementation((item: ListaEquipoItem) => {
    if (item.costoElegido) return item.costoElegido
    if (item.cotizacionSeleccionada) {
      return item.cotizacionSeleccionada.precioUnitario * (item.cantidad || 0)
    }
    return 0
  })
  
  calcularCostoTotal.mockImplementation((items: ListaEquipoItem[]) => {
    return items.reduce((sum, item) => sum + calcularCostoItem(item), 0)
  })
  
  formatCurrency.mockImplementation((amount: number) => `$${amount.toFixed(2)}`)
})

describe('ListaEquipoItemList', () => {
  describe('Cost Calculation Integration', () => {
    it('should use calcularCostoItem for individual item costs', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Verify calcularCostoItem is called for each item
      expect(calcularCostoItem).toHaveBeenCalledWith(mockItems[0])
      expect(calcularCostoItem).toHaveBeenCalledWith(mockItems[1])
      expect(calcularCostoItem).toHaveBeenCalledWith(mockItems[2])
    })

    it('should use calcularCostoTotal for total calculation', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Verify calcularCostoTotal is called with all items
      expect(calcularCostoTotal).toHaveBeenCalledWith(mockItems)
    })

    it('should display formatted costs using formatCurrency', () => {
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // ✅ Verify formatCurrency is called for cost formatting
      expect(formatCurrency).toHaveBeenCalled()
    })

    it('should prioritize costoElegido over calculated costs', () => {
      const itemWithCostoElegido = mockItems[0] // Has costoElegido: 500.00
      
      render(<ListaEquipoItemList {...defaultProps} items={[itemWithCostoElegido]} />)
      
      // ✅ Should use costoElegido (500.00) not calculated (200 * 2 = 400)
      expect(calcularCostoItem).toHaveBeenCalledWith(itemWithCostoElegido)
      expect(calcularCostoItem).toHaveReturnedWith(500.00)
    })

    it('should calculate cost from cotizacion when costoElegido is null', () => {
      const itemWithoutCostoElegido = mockItems[1] // costoElegido: null
      
      render(<ListaEquipoItemList {...defaultProps} items={[itemWithoutCostoElegido]} />)
      
      // ✅ Should calculate: 300 * 1 = 300
      expect(calcularCostoItem).toHaveBeenCalledWith(itemWithoutCostoElegido)
      expect(calcularCostoItem).toHaveReturnedWith(300.00)
    })

    it('should handle items without cost data', () => {
      const itemWithoutCost = mockItems[2] // No cotizacionSeleccionada
      
      render(<ListaEquipoItemList {...defaultProps} items={[itemWithoutCost]} />)
      
      // ✅ Should return 0 for items without cost data
      expect(calcularCostoItem).toHaveBeenCalledWith(itemWithoutCost)
      expect(calcularCostoItem).toHaveReturnedWith(0)
    })
  })

  describe('Cost Display', () => {
    it('should display cost when item has cost data', () => {
      calcularCostoItem.mockReturnValue(500.00)
      formatCurrency.mockReturnValue('$500.00')
      
      render(<ListaEquipoItemList {...defaultProps} items={[mockItems[0]]} />)
      
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })

    it('should display "—" when item has no cost', () => {
      calcularCostoItem.mockReturnValue(0)
      
      render(<ListaEquipoItemList {...defaultProps} items={[mockItems[2]]} />)
      
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('should display total cost in statistics', () => {
      calcularCostoTotal.mockReturnValue(800.00)
      formatCurrency.mockReturnValue('$800.00')
      
      render(<ListaEquipoItemList {...defaultProps} />)
      
      expect(screen.getByText('$800.00')).toBeInTheDocument()
    })
  })

  describe('View Modes', () => {
    it('should display costs in table view', () => {
      calcularCostoItem.mockReturnValue(500.00)
      formatCurrency.mockReturnValue('$500.00')
      
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // Switch to table view if not default
      const tableViewButton = screen.queryByRole('button', { name: /tabla/i })
      if (tableViewButton) {
        fireEvent.click(tableViewButton)
      }
      
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })

    it('should display costs in card view', () => {
      calcularCostoItem.mockReturnValue(500.00)
      formatCurrency.mockReturnValue('$500.00')
      
      render(<ListaEquipoItemList {...defaultProps} />)
      
      // Switch to card view if not default
      const cardViewButton = screen.queryByRole('button', { name: /tarjetas/i })
      if (cardViewButton) {
        fireEvent.click(cardViewButton)
      }
      
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle calculation errors gracefully', () => {
      calcularCostoItem.mockImplementation(() => {
        throw new Error('Calculation error')
      })
      
      // Should not crash the component
      expect(() => {
        render(<ListaEquipoItemList {...defaultProps} />)
      }).not.toThrow()
    })

    it('should handle null/undefined items', () => {
      const itemsWithNull = [mockItems[0], null, mockItems[1]] as any
      
      expect(() => {
        render(<ListaEquipoItemList {...defaultProps} items={itemsWithNull} />)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not recalculate costs unnecessarily', () => {
      const { rerender } = render(<ListaEquipoItemList {...defaultProps} />)
      
      const initialCallCount = calcularCostoTotal.mock.calls.length
      
      // Rerender with same props
      rerender(<ListaEquipoItemList {...defaultProps} />)
      
      // Should use memoization to avoid unnecessary recalculations
      expect(calcularCostoTotal.mock.calls.length).toBe(initialCallCount)
    })
  })
})