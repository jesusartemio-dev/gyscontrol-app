// ===================================================
// 📁 Archivo: pedidoHelpers.simple.test.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Tests simplificados para funciones helper de pedidos
// ===================================================

import {
  getCodigoPedidoRelevante,
  getIdPedidoRelevante,
  getTextoPorEstadoConCodigo,
  getTextoPorEstado,
  getBadgeVariantPorEstado,
  type PedidoItemResumen
} from './pedidoHelpers'

// 🧪 Mock data simplificado
const mockPedidoEquipo = {
  id: 'pedido-1',
  codigo: 'STK01-PED-001'
}

const mockPedidoEquipoItem = {
  id: 'item-1',
  pedidoId: 'pedido-1',
  cantidadPedida: 5,
  cantidadAtendida: 2,
  estado: 'pendiente' as const,
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  pedido: mockPedidoEquipo
}

const mockResumenConPedidos: PedidoItemResumen = {
  totalPedidos: 1,
  cantidadTotalPedida: 5,
  cantidadTotalAtendida: 2,
  pedidosActivos: [mockPedidoEquipoItem],
  ultimoPedido: mockPedidoEquipoItem,
  estado: 'pendiente'
}

const mockResumenSinPedidos: PedidoItemResumen = {
  totalPedidos: 0,
  cantidadTotalPedida: 0,
  cantidadTotalAtendida: 0,
  pedidosActivos: [],
  ultimoPedido: undefined,
  estado: 'sin_pedidos'
}

describe('pedidoHelpers - Core Functions', () => {
  describe('getCodigoPedidoRelevante', () => {
    it('should return order code from active orders', () => {
      const codigo = getCodigoPedidoRelevante(mockResumenConPedidos)
      expect(codigo).toBe('STK01-PED-001')
    })

    it('should return undefined for empty summary', () => {
      const codigo = getCodigoPedidoRelevante(mockResumenSinPedidos)
      expect(codigo).toBeUndefined()
    })
  })

  describe('getIdPedidoRelevante', () => {
    it('should return order ID from active orders', () => {
      const pedidoId = getIdPedidoRelevante(mockResumenConPedidos)
      expect(pedidoId).toBe('pedido-1')
    })

    it('should return undefined for empty summary', () => {
      const pedidoId = getIdPedidoRelevante(mockResumenSinPedidos)
      expect(pedidoId).toBeUndefined()
    })
  })

  describe('getTextoPorEstadoConCodigo', () => {
    it('should return order code with quantity when available', () => {
      const texto = getTextoPorEstadoConCodigo('pendiente', mockResumenConPedidos)
      expect(texto).toBe('STK01-PED-001\n5 / 10 unid.')
    })

    it('should fallback to state text when no orders', () => {
      const texto = getTextoPorEstadoConCodigo('sin_pedidos', mockResumenSinPedidos)
      expect(texto).toBe('Sin pedidos')
    })

    it('should fallback to state text when no summary provided', () => {
      const texto = getTextoPorEstadoConCodigo('pendiente')
      expect(texto).toBe('Pendiente')
    })
  })

  describe('getTextoPorEstado', () => {
    it('should return correct text for each state', () => {
      expect(getTextoPorEstado('pendiente')).toBe('Pendiente')
      expect(getTextoPorEstado('atendido')).toBe('Atendido')
      expect(getTextoPorEstado('parcial')).toBe('Parcial')
      expect(getTextoPorEstado('sin_pedidos')).toBe('Sin pedidos')
    })
  })

  describe('getBadgeVariantPorEstado', () => {
    it('should return correct badge variants', () => {
      expect(getBadgeVariantPorEstado('pendiente')).toBe('outline')
      expect(getBadgeVariantPorEstado('atendido')).toBe('default')
      expect(getBadgeVariantPorEstado('parcial')).toBe('secondary')
      expect(getBadgeVariantPorEstado('sin_pedidos')).toBe('outline')
    })
  })
})