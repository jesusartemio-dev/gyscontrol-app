/**
 * @fileoverview Tests simplificados para las funciones helper de pedidos
 * @author GYS Team
 * @date 2025-01-15
 */

import {
  calcularResumenPedidos,
  getBadgeVariantPorEstado,
  getTextoPorEstado,
  getClasesFilaPorEstado,
  tienePedidosActivos,
  estaDisponible
} from '../pedidoHelpers'

// 🧪 Mock data for testing
const mockPedidoCompleto = {
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

const mockPedidoParcial = {
  ...mockPedidoCompleto,
  id: 'pedido-2',
  cantidadPedida: 10,
  cantidadAtendida: 5,
  estado: 'parcial'
}

const mockPedidoPendiente = {
  ...mockPedidoCompleto,
  id: 'pedido-3',
  cantidadPedida: 8,
  cantidadAtendida: 0,
  estado: 'pendiente'
}

describe('pedidoHelpers - Core Functions', () => {
  describe('calcularResumenPedidos', () => {
    test('should return disponible for empty pedidos array', () => {
      const result = calcularResumenPedidos([])
      
      expect(result.estado).toBe('disponible')
      expect(result.totalPedidos).toBe(0)
      expect(result.cantidadTotalPedida).toBe(0)
      expect(result.cantidadTotalAtendida).toBe(0)
    })

    test('should calculate correct summary for single complete pedido', () => {
      const result = calcularResumenPedidos([mockPedidoCompleto])
      
      expect(result.estado).toBe('completo')
      expect(result.totalPedidos).toBe(1)
      expect(result.cantidadTotalPedida).toBe(10)
      expect(result.cantidadTotalAtendida).toBe(10)
      expect(result.pedidosCompletos).toBe(1)
    })

    test('should calculate correct summary for partial pedido', () => {
      const result = calcularResumenPedidos([mockPedidoParcial])
      
      expect(result.estado).toBe('parcial')
      expect(result.totalPedidos).toBe(1)
      expect(result.cantidadTotalPedida).toBe(10)
      expect(result.cantidadTotalAtendida).toBe(5)
      expect(result.pedidosParciales).toBe(1)
    })

    test('should calculate correct summary for pending pedido', () => {
      const result = calcularResumenPedidos([mockPedidoPendiente])
      
      expect(result.estado).toBe('en_pedido')
      expect(result.totalPedidos).toBe(1)
      expect(result.cantidadTotalPedida).toBe(8)
      expect(result.cantidadTotalAtendida).toBe(0)
    })
  })

  describe('getBadgeVariantPorEstado', () => {
    test('should return correct badge variants', () => {
      expect(getBadgeVariantPorEstado('sin_pedidos')).toBe('outline')
      expect(getBadgeVariantPorEstado('pendiente')).toBe('secondary')
      expect(getBadgeVariantPorEstado('parcial')).toBe('default')
      expect(getBadgeVariantPorEstado('atendido')).toBe('default')
      expect(getBadgeVariantPorEstado('entregado')).toBe('secondary')
    })
  })

  describe('getTextoPorEstado', () => {
    test('should return correct text for each estado', () => {
      expect(getTextoPorEstado('sin_pedidos')).toBe('Sin pedidos')
      expect(getTextoPorEstado('pendiente')).toBe('Pendiente')
      expect(getTextoPorEstado('parcial')).toBe('Parcial')
      expect(getTextoPorEstado('atendido')).toBe('Atendido')
      expect(getTextoPorEstado('entregado')).toBe('Entregado')
    })
  })

  describe('getClasesFilaPorEstado', () => {
    test('should return correct CSS classes for each estado', () => {
      expect(getClasesFilaPorEstado('sin_pedidos')).toBe('')
      expect(getClasesFilaPorEstado('pendiente')).toBe('border-l-4 border-l-yellow-400 bg-yellow-50/50')
      expect(getClasesFilaPorEstado('parcial')).toBe('border-l-4 border-l-blue-400 bg-blue-50/50')
      expect(getClasesFilaPorEstado('atendido')).toBe('border-l-4 border-l-green-400 bg-green-50/50')
      expect(getClasesFilaPorEstado('entregado')).toBe('border-l-4 border-l-gray-400 bg-gray-50/50')
    })
  })

  describe('tienePedidosActivos', () => {
    test('should return false for empty pedidos', () => {
      expect(tienePedidosActivos([])).toBe(false)
    })

    test('should return true for active pedidos', () => {
      expect(tienePedidosActivos([mockPedidoCompleto])).toBe(true)
      expect(tienePedidosActivos([mockPedidoParcial])).toBe(true)
      expect(tienePedidosActivos([mockPedidoPendiente])).toBe(true)
    })
  })

  describe('estaDisponible', () => {
    test('should return true for empty pedidos', () => {
      expect(estaDisponible([])).toBe(true)
    })

    test('should return false for items with active pedidos', () => {
      expect(estaDisponible([mockPedidoCompleto])).toBe(false)
      expect(estaDisponible([mockPedidoParcial])).toBe(false)
      expect(estaDisponible([mockPedidoPendiente])).toBe(false)
    })
  })
})
