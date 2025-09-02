// ===================================================
// 📁 Archivo: costoCalculations.test.ts
// 📌 Ubicación: src/lib/utils/__tests__/
// 🔧 Descripción: Tests para utilidades de cálculos de costos
// ===================================================

import { describe, it, expect } from 'vitest'
import { calcularCostoItem, calcularCostoTotal, formatCurrency } from '../costoCalculations'
import type { ListaEquipoItem } from '@/types'

// 🧪 Mock data
const mockItemWithCostoElegido: ListaEquipoItem = {
  id: '1',
  codigo: 'EQ001',
  descripcion: 'Equipo con costo elegido',
  unidad: 'pza',
  cantidad: 2,
  costoElegido: 500.00, // ✅ Priority field
  cotizacionSeleccionada: {
    id: 'cot1',
    precioUnitario: 200.00, // Should be ignored when costoElegido exists
    moneda: 'USD',
    proveedor: 'Proveedor A',
    tiempoEntrega: '15 días'
  },
  estado: 'aprobado',
  origen: 'cotizado',
  verificado: true,
  listaId: 'lista1',
  catalogoEquipoId: 'cat1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockItemWithCotizacion: ListaEquipoItem = {
  id: '2',
  codigo: 'EQ002',
  descripcion: 'Equipo con cotización',
  unidad: 'pza',
  cantidad: 3,
  costoElegido: null, // ✅ No costo elegido
  cotizacionSeleccionada: {
    id: 'cot2',
    precioUnitario: 150.00,
    moneda: 'USD',
    proveedor: 'Proveedor B',
    tiempoEntrega: '10 días'
  },
  estado: 'aprobado',
  origen: 'cotizado',
  verificado: true,
  listaId: 'lista1',
  catalogoEquipoId: 'cat2',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockItemWithoutCost: ListaEquipoItem = {
  id: '3',
  codigo: 'EQ003',
  descripcion: 'Equipo sin costo',
  unidad: 'pza',
  cantidad: 1,
  costoElegido: null,
  cotizacionSeleccionada: null,
  estado: 'pendiente',
  origen: 'nuevo',
  verificado: false,
  listaId: 'lista1',
  catalogoEquipoId: 'cat3',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('costoCalculations', () => {
  describe('calcularCostoItem', () => {
    it('should prioritize costoElegido when available', () => {
      const result = calcularCostoItem(mockItemWithCostoElegido)
      expect(result).toBe(500.00)
    })

    it('should calculate from cotizacionSeleccionada when costoElegido is null', () => {
      const result = calcularCostoItem(mockItemWithCotizacion)
      expect(result).toBe(450.00) // 150 * 3
    })

    it('should return 0 when no cost data is available', () => {
      const result = calcularCostoItem(mockItemWithoutCost)
      expect(result).toBe(0)
    })

    it('should handle undefined costoElegido', () => {
      const itemWithUndefinedCosto = {
        ...mockItemWithCotizacion,
        costoElegido: undefined
      }
      const result = calcularCostoItem(itemWithUndefinedCosto as ListaEquipoItem)
      expect(result).toBe(450.00)
    })

    it('should handle zero cantidad', () => {
      const itemWithZeroCantidad = {
        ...mockItemWithCotizacion,
        cantidad: 0,
        costoElegido: null
      }
      const result = calcularCostoItem(itemWithZeroCantidad)
      expect(result).toBe(0)
    })

    it('should handle null cantidad', () => {
      const itemWithNullCantidad = {
        ...mockItemWithCotizacion,
        cantidad: null,
        costoElegido: null
      }
      const result = calcularCostoItem(itemWithNullCantidad as any)
      expect(result).toBe(0)
    })
  })

  describe('calcularCostoTotal', () => {
    it('should sum costs from multiple items', () => {
      const items = [mockItemWithCostoElegido, mockItemWithCotizacion, mockItemWithoutCost]
      const result = calcularCostoTotal(items)
      expect(result).toBe(950.00) // 500 + 450 + 0
    })

    it('should handle empty array', () => {
      const result = calcularCostoTotal([])
      expect(result).toBe(0)
    })

    it('should handle array with only items without cost', () => {
      const items = [mockItemWithoutCost, mockItemWithoutCost]
      const result = calcularCostoTotal(items)
      expect(result).toBe(0)
    })
  })

  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0.99)).toBe('$0.99')
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-123.45)).toBe('-$123.45')
    })

    it('should handle decimal precision', () => {
      expect(formatCurrency(123.456789)).toBe('$123.46')
      expect(formatCurrency(123.454)).toBe('$123.45')
    })
  })
})

// 🎯 Integration tests
describe('costoCalculations integration', () => {
  it('should work together in a realistic scenario', () => {
    const items = [
      mockItemWithCostoElegido,    // 500.00
      mockItemWithCotizacion,      // 450.00 (150 * 3)
      mockItemWithoutCost          // 0.00
    ]

    const total = calcularCostoTotal(items)
    const formattedTotal = formatCurrency(total)
    
    expect(total).toBe(950.00)
    expect(formattedTotal).toBe('$950.00')
  })

  it('should prioritize costoElegido over calculated values consistently', () => {
    const itemsWithMixedCosts = [
      {
        ...mockItemWithCostoElegido,
        costoElegido: 100.00,
        cotizacionSeleccionada: {
          ...mockItemWithCostoElegido.cotizacionSeleccionada!,
          precioUnitario: 999.99 // Should be ignored
        }
      },
      {
        ...mockItemWithCotizacion,
        costoElegido: null // Should use calculation
      }
    ]

    const total = calcularCostoTotal(itemsWithMixedCosts)
    expect(total).toBe(550.00) // 100 + 450
  })
})