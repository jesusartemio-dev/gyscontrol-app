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
import { PedidoEquipoItem, ListaEquipoItem } from '@/types'

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
  estado: 'enviado',
  comentarioLogistica: 'Pedido completo',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockPedidoParcial: PedidoEquipoItem = {
  ...mockPedidoCompleto,
  id: 'pedido-2',
  cantidadPedida: 10,
  cantidadAtendida: 5,
  estado: 'parcial'
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
  categoria: 'Categoria A',
  unidad: 'pza',
  marca: 'Marca A',
  cantidad: 20,
  precioUnitario: 100,
  costoTotal: 2000,
  estado: 'activo',
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
  pedidos: []
}

const mockListaEquipoItemConPedidos: ListaEquipoItem = {
  ...mockListaEquipoItemSinPedidos,
  pedidos: [mockPedidoCompleto, mockPedidoParcial]
}

describe('pedidoHelpers', () => {
  describe('calcularResumenPedidos', () => {
    it('should return disponible for empty pedidos array', () => {
      const result = calcularResumenPedidos([])
      
      expect(result).toEqual({
        estado: 'disponible',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        pedidosActivos: 0,
        pedidosCompletos: 0,
        pedidosParciales: 0
      })
    })

    it('should calculate correct summary for single complete pedido', () => {
      const result = calcularResumenPedidos([mockPedidoCompleto])
      
      expect(result).toEqual({
        estado: 'completo',
        totalPedidos: 1,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 10,
        pedidosActivos: 1,
        pedidosCompletos: 1,
        pedidosParciales: 0
      })
    })

    it('should calculate correct summary for partial pedido', () => {
      const result = calcularResumenPedidos([mockPedidoParcial])
      
      expect(result).toEqual({
        estado: 'parcial',
        totalPedidos: 1,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 5,
        pedidosActivos: 1,
        pedidosCompletos: 0,
        pedidosParciales: 1
      })
    })

    it('should calculate correct summary for pending pedido', () => {
      const result = calcularResumenPedidos([mockPedidoPendiente])
      
      expect(result).toEqual({
        estado: 'en_pedido',
        totalPedidos: 1,
        cantidadTotalPedida: 8,
        cantidadTotalAtendida: 0,
        pedidosActivos: 1,
        pedidosCompletos: 0,
        pedidosParciales: 0
      })
    })

    it('should calculate correct summary for mixed pedidos', () => {
      const pedidos = [mockPedidoCompleto, mockPedidoParcial, mockPedidoPendiente]
      const result = calcularResumenPedidos(pedidos)
      
      expect(result).toEqual({
        estado: 'parcial', // Mixed state should be 'parcial'
        totalPedidos: 3,
        cantidadTotalPedida: 28, // 10 + 10 + 8
        cantidadTotalAtendida: 15, // 10 + 5 + 0
        pedidosActivos: 3,
        pedidosCompletos: 1,
        pedidosParciales: 1
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
      expect(getClasesFilaPorEstado('disponible')).toBe('')
      expect(getClasesFilaPorEstado('en_pedido')).toBe('border-l-4 border-l-blue-400 bg-blue-50/30')
      expect(getClasesFilaPorEstado('parcial')).toBe('border-l-4 border-l-yellow-400 bg-yellow-50/30')
      expect(getClasesFilaPorEstado('completo')).toBe('border-l-4 border-l-green-400 bg-green-50/30')
      expect(getClasesFilaPorEstado('unknown' as any)).toBe('')
    })
  })

  describe('getInfoPedidosParaTooltip', () => {
    it('should return empty array for disponible estado', () => {
      const resumen: EstadoPedidoItemResumen = {
        estado: 'disponible',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        pedidosActivos: 0,
        pedidosCompletos: 0,
        pedidosParciales: 0
      }
      
      const result = getInfoPedidosParaTooltip(resumen)
      expect(result).toEqual([])
    })

    it('should return correct info for en_pedido estado', () => {
      const resumen: EstadoPedidoItemResumen = {
        estado: 'en_pedido',
        totalPedidos: 2,
        cantidadTotalPedida: 15,
        cantidadTotalAtendida: 0,
        pedidosActivos: 2,
        pedidosCompletos: 0,
        pedidosParciales: 0
      }
      
      const result = getInfoPedidosParaTooltip(resumen)
      expect(result).toEqual([
        'Pedidos activos: 2',
        'Cantidad pedida: 15',
        'Pendiente de entrega: 15'
      ])
    })

    it('should return correct info for parcial estado', () => {
      const resumen: EstadoPedidoItemResumen = {
        estado: 'parcial',
        totalPedidos: 3,
        cantidadTotalPedida: 20,
        cantidadTotalAtendida: 12,
        pedidosActivos: 3,
        pedidosCompletos: 1,
        pedidosParciales: 2
      }
      
      const result = getInfoPedidosParaTooltip(resumen)
      expect(result).toEqual([
        'Pedidos activos: 3',
        'Cantidad pedida: 20',
        'Cantidad atendida: 12',
        'Pendiente: 8',
        'Completos: 1 | Parciales: 2'
      ])
    })

    it('should return correct info for completo estado', () => {
      const resumen: EstadoPedidoItemResumen = {
        estado: 'completo',
        totalPedidos: 2,
        cantidadTotalPedida: 25,
        cantidadTotalAtendida: 25,
        pedidosActivos: 2,
        pedidosCompletos: 2,
        pedidosParciales: 0
      }
      
      const result = getInfoPedidosParaTooltip(resumen)
      expect(result).toEqual([
        'Pedidos completos: 2',
        'Cantidad total: 25',
        'Totalmente atendido'
      ])
    })
  })

  describe('tienePedidosActivos', () => {
    it('should return false for empty pedidos', () => {
      expect(tienePedidosActivos([])).toBe(false)
    })

    it('should return true for active pedidos', () => {
      expect(tienePedidosActivos([mockPedidoCompleto])).toBe(true)
      expect(tienePedidosActivos([mockPedidoParcial])).toBe(true)
      expect(tienePedidosActivos([mockPedidoPendiente])).toBe(true)
    })

    it('should return false for cancelled pedidos', () => {
      const pedidoCancelado = { ...mockPedidoCompleto, estado: 'cancelado' }
      expect(tienePedidosActivos([pedidoCancelado])).toBe(false)
    })
  })

  describe('estaDisponible', () => {
    it('should return true for empty pedidos', () => {
      expect(estaDisponible([])).toBe(true)
    })

    it('should return false for items with active pedidos', () => {
      expect(estaDisponible([mockPedidoCompleto])).toBe(false)
      expect(estaDisponible([mockPedidoParcial])).toBe(false)
      expect(estaDisponible([mockPedidoPendiente])).toBe(false)
    })

    it('should return true for items with only cancelled pedidos', () => {
      const pedidoCancelado = { ...mockPedidoCompleto, estado: 'cancelado' }
      expect(estaDisponible([pedidoCancelado])).toBe(true)
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
      
      expect(() => calcularResumenPedidos([incompletePedido])).not.toThrow()
    })

    it('should handle negative quantities', () => {
      const negativePedido = {
        ...mockPedidoCompleto,
        cantidadPedida: -5,
        cantidadAtendida: -2
      }
      
      const result = calcularResumenPedidos([negativePedido])
      expect(result.cantidadTotalPedida).toBe(-5)
      expect(result.cantidadTotalAtendida).toBe(-2)
    })
  })
})
