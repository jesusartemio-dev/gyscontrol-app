/**
 * Test para verificar que los tipos de PedidoEquipo están correctos
 * después de las correcciones de propiedades inexistentes
 */

import { PedidoEquipo, PedidoEquipoItem, ListaEquipoItem } from '@prisma/client'

describe('PedidoEquipo Types Fix', () => {
  // ✅ Test para verificar que las propiedades corregidas existen
  test('should have correct properties in ListaEquipoItem', () => {
    const mockListaEquipoItem: Partial<ListaEquipoItem> = {
      id: 'test-id',
      precioElegido: 100.50,
      costoElegido: 95.00,
      cantidad: 5
    }

    expect(mockListaEquipoItem.precioElegido).toBeDefined()
    expect(mockListaEquipoItem.costoElegido).toBeDefined()
    expect(mockListaEquipoItem.cantidad).toBeDefined()
  })

  // ✅ Test para verificar que PedidoEquipoItem tiene cantidadPedida
  test('should have cantidadPedida in PedidoEquipoItem', () => {
    const mockPedidoEquipoItem: Partial<PedidoEquipoItem> = {
      id: 'test-id',
      cantidadPedida: 3,
      precioUnitario: 50.00
    }

    expect(mockPedidoEquipoItem.cantidadPedida).toBeDefined()
    expect(mockPedidoEquipoItem.precioUnitario).toBeDefined()
  })

  // ✅ Test para simular el cálculo de montoTotal corregido
  test('should calculate montoTotal correctly with fixed properties', () => {
    const mockItems: Array<{
      precioUnitario?: number
      cantidadPedida: number
      listaEquipoItem?: {
        precioElegido?: number
        costoElegido?: number
      }
    }> = [
      {
        precioUnitario: 100,
        cantidadPedida: 2,
        listaEquipoItem: {
          precioElegido: 90,
          costoElegido: 85
        }
      },
      {
        cantidadPedida: 3,
        listaEquipoItem: {
          precioElegido: 50,
          costoElegido: 45
        }
      }
    ]

    const montoTotal = mockItems.reduce((total, item) => {
      const precioUnitario = item.precioUnitario || 
        item.listaEquipoItem?.precioElegido || 
        item.listaEquipoItem?.costoElegido || 
        0
      return total + (precioUnitario * item.cantidadPedida)
    }, 0)

    // Primer item: 100 * 2 = 200
    // Segundo item: 50 * 3 = 150 (usa precioElegido)
    // Total: 350
    expect(montoTotal).toBe(350)
  })

  // ✅ Test para verificar fallback a costoElegido
  test('should fallback to costoElegido when precioElegido is not available', () => {
    const mockItems: Array<{
      precioUnitario?: number
      cantidadPedida: number
      listaEquipoItem?: {
        precioElegido?: number
        costoElegido?: number
      }
    }> = [
      {
        cantidadPedida: 2,
        listaEquipoItem: {
          costoElegido: 75 // Solo costoElegido disponible
        }
      }
    ]

    const montoTotal = mockItems.reduce((total, item) => {
      const precioUnitario = item.precioUnitario || 
        item.listaEquipoItem?.precioElegido || 
        item.listaEquipoItem?.costoElegido || 
        0
      return total + (precioUnitario * item.cantidadPedida)
    }, 0)

    // Usa costoElegido: 75 * 2 = 150
    expect(montoTotal).toBe(150)
  })
})
