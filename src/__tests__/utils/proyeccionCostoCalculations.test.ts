// ===================================================
// 📁 Test: proyeccionCostoCalculations.test.ts
// 📌 Verifica las utilidades de cálculo de costos de proyección
// 🧠 Prueba todas las funciones de proyeccionCostoCalculations.ts
// ✍️ Autor: IA GYS
// 📅 Fecha: 2025-01-27
// ===================================================

import {
  calcularCostoProyeccionItem,
  calcularCostoUnitarioProyeccion,
  calcularCostoTotalProyeccion,
  obtenerFuenteCosto,
  tieneDataCostoValida,
  type ListaProyeccionItem
} from '@/lib/utils/proyeccionCostoCalculations'

// 🧪 Mock data for testing
const mockBaseItem: ListaProyeccionItem = {
  id: 'item-1',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  cantidad: 10,
  unidad: 'pza',
  prioridad: 'media',
  estado: 'borrador'
}

const mockItemWithCostoElegido: ListaProyeccionItem = {
  ...mockBaseItem,
  costoElegido: 500,
  cotizacionSeleccionada: {
    precioUnitario: 40 // Should be ignored
  },
  catalogoEquipo: {
    precioVenta: 35 // Should be ignored
  }
}

const mockItemWithCotizacion: ListaProyeccionItem = {
  ...mockBaseItem,
  costoElegido: null,
  cotizacionSeleccionada: {
    precioUnitario: 25
  },
  catalogoEquipo: {
    precioVenta: 30 // Should be ignored
  }
}

const mockItemWithCatalogo: ListaProyeccionItem = {
  ...mockBaseItem,
  costoElegido: null,
  cotizacionSeleccionada: null,
  catalogoEquipo: {
    precioVenta: 20
  }
}

const mockItemWithoutCost: ListaProyeccionItem = {
  ...mockBaseItem,
  costoElegido: null,
  cotizacionSeleccionada: null,
  catalogoEquipo: null
}

describe('proyeccionCostoCalculations', () => {
  describe('calcularCostoProyeccionItem', () => {
    it('should prioritize costoElegido when available', () => {
      const result = calcularCostoProyeccionItem(mockItemWithCostoElegido)
      expect(result).toBe(500)
    })

    it('should calculate from cotizacionSeleccionada when costoElegido is null', () => {
      const result = calcularCostoProyeccionItem(mockItemWithCotizacion)
      expect(result).toBe(250) // 25 * 10
    })

    it('should calculate from catalogoEquipo when other options are not available', () => {
      const result = calcularCostoProyeccionItem(mockItemWithCatalogo)
      expect(result).toBe(200) // 20 * 10
    })

    it('should return 0 when no cost data is available', () => {
      const result = calcularCostoProyeccionItem(mockItemWithoutCost)
      expect(result).toBe(0)
    })

    it('should handle undefined costoElegido', () => {
      const itemWithUndefinedCosto = {
        ...mockItemWithCotizacion,
        costoElegido: undefined
      }
      const result = calcularCostoProyeccionItem(itemWithUndefinedCosto)
      expect(result).toBe(250) // Uses cotización
    })

    it('should handle zero cantidad', () => {
      const itemWithZeroCantidad = {
        ...mockItemWithCotizacion,
        cantidad: 0,
        costoElegido: null
      }
      const result = calcularCostoProyeccionItem(itemWithZeroCantidad)
      expect(result).toBe(0)
    })
  })

  describe('calcularCostoUnitarioProyeccion', () => {
    it('should calculate unit cost correctly', () => {
      const result = calcularCostoUnitarioProyeccion(mockItemWithCostoElegido)
      expect(result).toBe(50) // 500 / 10
    })

    it('should return 0 when cantidad is zero', () => {
      const itemWithZeroCantidad = {
        ...mockItemWithCostoElegido,
        cantidad: 0
      }
      const result = calcularCostoUnitarioProyeccion(itemWithZeroCantidad)
      expect(result).toBe(0)
    })

    it('should return 0 when cantidad is negative', () => {
      const itemWithNegativeCantidad = {
        ...mockItemWithCostoElegido,
        cantidad: -5
      }
      const result = calcularCostoUnitarioProyeccion(itemWithNegativeCantidad)
      expect(result).toBe(0)
    })

    it('should handle items without cost data', () => {
      const result = calcularCostoUnitarioProyeccion(mockItemWithoutCost)
      expect(result).toBe(0)
    })
  })

  describe('calcularCostoTotalProyeccion', () => {
    it('should sum costs from multiple items', () => {
      const items = [
        mockItemWithCostoElegido,  // 500
        mockItemWithCotizacion,    // 250
        mockItemWithCatalogo,      // 200
        mockItemWithoutCost        // 0
      ]
      const result = calcularCostoTotalProyeccion(items)
      expect(result).toBe(950) // 500 + 250 + 200 + 0
    })

    it('should handle empty array', () => {
      const result = calcularCostoTotalProyeccion([])
      expect(result).toBe(0)
    })

    it('should handle array with only items without cost', () => {
      const items = [mockItemWithoutCost, mockItemWithoutCost]
      const result = calcularCostoTotalProyeccion(items)
      expect(result).toBe(0)
    })
  })

  describe('obtenerFuenteCosto', () => {
    it('should return "costoElegido" when costoElegido is available', () => {
      const result = obtenerFuenteCosto(mockItemWithCostoElegido)
      expect(result).toBe('costoElegido')
    })

    it('should return "cotizacionSeleccionada" when only cotización is available', () => {
      const result = obtenerFuenteCosto(mockItemWithCotizacion)
      expect(result).toBe('cotizacionSeleccionada')
    })

    it('should return "catalogoEquipo" when only catálogo is available', () => {
      const result = obtenerFuenteCosto(mockItemWithCatalogo)
      expect(result).toBe('catalogoEquipo')
    })

    it('should return "sin_costo" when no cost data is available', () => {
      const result = obtenerFuenteCosto(mockItemWithoutCost)
      expect(result).toBe('sin_costo')
    })

    it('should handle undefined costoElegido', () => {
      const itemWithUndefinedCosto = {
        ...mockItemWithCotizacion,
        costoElegido: undefined
      }
      const result = obtenerFuenteCosto(itemWithUndefinedCosto)
      expect(result).toBe('cotizacionSeleccionada')
    })
  })

  describe('tieneDataCostoValida', () => {
    it('should return true when item has valid cost data', () => {
      expect(tieneDataCostoValida(mockItemWithCostoElegido)).toBe(true)
      expect(tieneDataCostoValida(mockItemWithCotizacion)).toBe(true)
      expect(tieneDataCostoValida(mockItemWithCatalogo)).toBe(true)
    })

    it('should return false when item has no cost data', () => {
      expect(tieneDataCostoValida(mockItemWithoutCost)).toBe(false)
    })

    it('should return false when item has zero cost', () => {
      const itemWithZeroCost = {
        ...mockItemWithCostoElegido,
        costoElegido: 0
      }
      expect(tieneDataCostoValida(itemWithZeroCost)).toBe(false)
    })

    it('should return false when cantidad is zero', () => {
      const itemWithZeroCantidad = {
        ...mockItemWithCotizacion,
        cantidad: 0
      }
      expect(tieneDataCostoValida(itemWithZeroCantidad)).toBe(false)
    })
  })

  // 🎯 Integration tests
  describe('Integration scenarios', () => {
    it('should work together in a realistic cost calculation scenario', () => {
      const items = [
        mockItemWithCostoElegido,    // 500.00
        mockItemWithCotizacion,      // 250.00 (25 * 10)
        mockItemWithCatalogo,        // 200.00 (20 * 10)
        mockItemWithoutCost          // 0.00
      ]

      const total = calcularCostoTotalProyeccion(items)
      const unitCosts = items.map(item => calcularCostoUnitarioProyeccion(item))
      const costSources = items.map(item => obtenerFuenteCosto(item))
      const validItems = items.filter(item => tieneDataCostoValida(item))
      
      expect(total).toBe(950.00)
      expect(unitCosts).toEqual([50, 25, 20, 0])
      expect(costSources).toEqual(['costoElegido', 'cotizacionSeleccionada', 'catalogoEquipo', 'sin_costo'])
      expect(validItems).toHaveLength(3)
    })

    it('should prioritize costoElegido over calculated values consistently', () => {
      const itemsWithMixedCosts = [
        {
          ...mockBaseItem,
          id: 'mixed-1',
          costoElegido: 100.00,
          cotizacionSeleccionada: {
            precioUnitario: 999.99 // Should be ignored
          },
          catalogoEquipo: {
            precioVenta: 888.88 // Should be ignored
          }
        },
        {
          ...mockBaseItem,
          id: 'mixed-2',
          costoElegido: null, // Should use calculation
          cotizacionSeleccionada: {
            precioUnitario: 15
          }
        }
      ]

      const total = calcularCostoTotalProyeccion(itemsWithMixedCosts)
      expect(total).toBe(250.00) // 100 + (15 * 10)
    })
  })
})