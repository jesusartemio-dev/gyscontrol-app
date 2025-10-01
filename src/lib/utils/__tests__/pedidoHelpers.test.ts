/**
 * @fileoverview Tests para las funciones helper de pedidos
 * @author GYS Team
 * @date 2025-01-15
 */

import {
  calcularResumenPedidos,
  getBadgeVariantPorEstado,
  getTextoPorEstado,
  getClasesFilaPorEstado,
  getInfoPedidosParaTooltip,
  tienePedidosActivos,
  estaDisponible,
  type EstadoPedidoItemResumen
} from '../pedidoHelpers'
import { PedidoEquipoItem, ListaEquipoItem } from '@/types/modelos'

// 🧪 Mock data for testing
const mockPedidoCompleto: PedidoEquipoItem = {
  id: 'pedido-1',
  pedidoId: 'ped-1',
  listaId: 'lista-1',
  listaEquipoItemId: 'item-1',
  cantidadPedida: 10,
  cantidadAtendida: 10,
  precioUnitario: 100,
  costoTotal: 1000,
  estado: 'entregado',
  comentarioLogistica: 'Pedido completo',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z'
}

const mockPedidoParcial: PedidoEquipoItem = {
  ...mockPedidoCompleto,
  id: 'pedido-2',
  cantidadPedida: 10,
  cantidadAtendida: 5,
  estado: 'atendido'
}

const mockPedidoPendiente: PedidoEquipoItem = {
  ...mockPedidoCompleto,
  id: 'pedido-3',
  cantidadPedida: 8,
  cantidadAtendida: 0,
  estado: 'pendiente'
}

// 🧪 Mock ListaEquipoItem data
const mockListaEquipoItemSinPedidos: ListaEquipoItem = {
  id: 'item-1',
  listaId: 'lista-1',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  cantidad: 20,
  verificado: true,
  estado: 'aprobado',
  origen: 'nuevo',
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
  lista: { id: 'lista-1', nombre: 'Lista de Prueba', codigo: 'LST-001', estado: 'borrador', responsableId: 'user-1', numeroSecuencia: 1, createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-01-15T00:00:00Z', proyectoId: 'proyecto-1', items: [] },
  pedidos: [],
  cotizaciones: []
}

const mockListaEquipoItemConPedidos: ListaEquipoItem = {
  ...mockListaEquipoItemSinPedidos,
  pedidos: [mockPedidoCompleto, mockPedidoParcial]
}

describe('pedidoHelpers', () => {
  describe('calcularResumenPedidos', () => {
    it('should return sin_pedidos for empty pedidos array', () => {
      const result = calcularResumenPedidos(mockListaEquipoItemSinPedidos)

      expect(result).toEqual({
        estado: 'sin_pedidos',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 20,
        pedidosActivos: [],
        ultimoPedido: undefined
      })
    })

    it('should calculate correct summary for single complete pedido', () => {
      const itemWithCompletePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoCompleto]
      }
      const result = calcularResumenPedidos(itemWithCompletePedido)

      expect(result).toEqual({
        estado: 'entregado',
        totalPedidos: 1,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 10,
        cantidadDisponible: 10,
        pedidosActivos: [],
        ultimoPedido: mockPedidoCompleto
      })
    })

    it('should calculate correct summary for partial pedido', () => {
      const itemWithPartialPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoParcial]
      }
      const result = calcularResumenPedidos(itemWithPartialPedido)

      expect(result).toEqual({
        estado: 'parcial',
        totalPedidos: 1,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 5,
        cantidadDisponible: 10,
        pedidosActivos: [mockPedidoParcial],
        ultimoPedido: mockPedidoParcial
      })
    })

    it('should calculate correct summary for pending pedido', () => {
      const itemWithPendingPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoPendiente]
      }
      const result = calcularResumenPedidos(itemWithPendingPedido)

      expect(result).toEqual({
        estado: 'pendiente',
        totalPedidos: 1,
        cantidadTotalPedida: 8,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 12,
        pedidosActivos: [mockPedidoPendiente],
        ultimoPedido: mockPedidoPendiente
      })
    })

    it('should calculate correct summary for mixed pedidos', () => {
      const itemWithMixedPedidos: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoCompleto, mockPedidoParcial, mockPedidoPendiente]
      }
      const result = calcularResumenPedidos(itemWithMixedPedidos)

      expect(result).toEqual({
        estado: 'parcial', // Mixed state should be 'parcial'
        totalPedidos: 3,
        cantidadTotalPedida: 28, // 10 + 10 + 8
        cantidadTotalAtendida: 15, // 10 + 5 + 0
        cantidadDisponible: -8,
        pedidosActivos: [mockPedidoParcial, mockPedidoPendiente],
        ultimoPedido: mockPedidoPendiente
      })
    })
  })

  describe('getBadgeVariantPorEstado', () => {
    it('should return correct badge variants', () => {
      expect(getBadgeVariantPorEstado('sin_pedidos')).toBe('outline')
      expect(getBadgeVariantPorEstado('pendiente')).toBe('secondary')
      expect(getBadgeVariantPorEstado('parcial')).toBe('default')
      expect(getBadgeVariantPorEstado('atendido')).toBe('default')
      expect(getBadgeVariantPorEstado('entregado')).toBe('secondary')
      expect(getBadgeVariantPorEstado('unknown' as any)).toBe('outline')
    })
  })

  describe('getTextoPorEstado', () => {
    it('should return correct text for each estado', () => {
      expect(getTextoPorEstado('sin_pedidos')).toBe('Sin pedidos')
      expect(getTextoPorEstado('pendiente')).toBe('Pendiente')
      expect(getTextoPorEstado('parcial')).toBe('Parcial')
      expect(getTextoPorEstado('atendido')).toBe('Atendido')
      expect(getTextoPorEstado('entregado')).toBe('Entregado')
      expect(getTextoPorEstado('unknown' as any)).toBe('Desconocido')
    })
  })

  describe('getClasesFilaPorEstado', () => {
    it('should return correct CSS classes for each estado', () => {
      expect(getClasesFilaPorEstado('sin_pedidos')).toBe('')
      expect(getClasesFilaPorEstado('pendiente')).toBe('border-l-4 border-l-yellow-400 bg-yellow-50/50')
      expect(getClasesFilaPorEstado('parcial')).toBe('border-l-4 border-l-blue-400 bg-blue-50/50')
      expect(getClasesFilaPorEstado('atendido')).toBe('border-l-4 border-l-green-400 bg-green-50/50')
      expect(getClasesFilaPorEstado('entregado')).toBe('border-l-4 border-l-gray-400 bg-gray-50/50')
      expect(getClasesFilaPorEstado('unknown' as any)).toBe('')
    })
  })

  describe('getInfoPedidosParaTooltip', () => {
    it('should return correct info for sin_pedidos estado', () => {
      const result = getInfoPedidosParaTooltip(mockListaEquipoItemSinPedidos)
      expect(result).toBe('Cantidad disponible: 20')
    })

    it('should return correct info for pendiente estado', () => {
      const itemWithPendingPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoPendiente]
      }

      const result = getInfoPedidosParaTooltip(itemWithPendingPedido)
      expect(result).toContain('Total pedidos: 1')
      expect(result).toContain('Cantidad pedida: 8')
      expect(result).toContain('Cantidad atendida: 0')
      expect(result).toContain('Disponible: 12')
    })

    it('should return correct info for parcial estado', () => {
      const itemWithPartialPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoParcial]
      }

      const result = getInfoPedidosParaTooltip(itemWithPartialPedido)
      expect(result).toContain('Total pedidos: 1')
      expect(result).toContain('Cantidad pedida: 10')
      expect(result).toContain('Cantidad atendida: 5')
      expect(result).toContain('Disponible: 10')
    })

    it('should return correct info for entregado estado', () => {
      const itemWithCompletePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoCompleto]
      }

      const result = getInfoPedidosParaTooltip(itemWithCompletePedido)
      expect(result).toContain('Total pedidos: 1')
      expect(result).toContain('Cantidad pedida: 10')
      expect(result).toContain('Cantidad atendida: 10')
      expect(result).toContain('Disponible: 10')
    })
  })

  describe('tienePedidosActivos', () => {
    it('should return false for empty pedidos', () => {
      expect(tienePedidosActivos(mockListaEquipoItemSinPedidos)).toBe(false)
    })

    it('should return true for active pedidos', () => {
      const itemWithCompletePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoCompleto]
      }
      const itemWithPartialPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoParcial]
      }
      const itemWithPendingPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoPendiente]
      }
      expect(tienePedidosActivos(itemWithCompletePedido)).toBe(false)
      expect(tienePedidosActivos(itemWithPartialPedido)).toBe(true)
      expect(tienePedidosActivos(itemWithPendingPedido)).toBe(true)
    })

    it('should return false for cancelled pedidos', () => {
      const pedidoCancelado = { ...mockPedidoCompleto, estado: 'cancelado' as any }
      const itemWithCancelledPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [pedidoCancelado]
      }
      expect(tienePedidosActivos(itemWithCancelledPedido)).toBe(false)
    })
  })

  describe('estaDisponible', () => {
    it('should return true for empty pedidos', () => {
      expect(estaDisponible(mockListaEquipoItemSinPedidos)).toBe(true)
    })

    it('should return false for items with active pedidos', () => {
      const itemWithCompletePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoCompleto]
      }
      const itemWithPartialPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoParcial]
      }
      const itemWithPendingPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [mockPedidoPendiente]
      }
      expect(estaDisponible(itemWithCompletePedido)).toBe(false)
      expect(estaDisponible(itemWithPartialPedido)).toBe(false)
      expect(estaDisponible(itemWithPendingPedido)).toBe(false)
    })

    it('should return true for items with only cancelled pedidos', () => {
      const pedidoCancelado = { ...mockPedidoCompleto, estado: 'cancelado' as any }
      const itemWithCancelledPedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [pedidoCancelado]
      }
      expect(estaDisponible(itemWithCancelledPedido)).toBe(true)
    })
  })

  // 🧪 Edge cases and error handling
  describe('Edge Cases', () => {
    it('should handle null/undefined pedidos gracefully', () => {
      expect(() => calcularResumenPedidos(null as any)).not.toThrow()
      expect(() => calcularResumenPedidos(undefined as any)).not.toThrow()
    })

    it('should handle pedidos with missing properties', () => {
      const incompletePedido = {
        id: 'incomplete',
        cantidadPedida: 5
      } as PedidoEquipoItem

      const itemWithIncompletePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [incompletePedido]
      }

      expect(() => calcularResumenPedidos(itemWithIncompletePedido)).not.toThrow()
    })

    it('should handle negative quantities', () => {
      const negativePedido = {
        ...mockPedidoCompleto,
        cantidadPedida: -5,
        cantidadAtendida: -2
      }

      const itemWithNegativePedido: ListaEquipoItem = {
        ...mockListaEquipoItemSinPedidos,
        pedidos: [negativePedido]
      }

      const result = calcularResumenPedidos(itemWithNegativePedido)
      expect(result.cantidadTotalPedida).toBe(-5)
      expect(result.cantidadTotalAtendida).toBe(-2)
    })
  })
})
