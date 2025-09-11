// 📁 Archivo: pedidoHelpers-codigo.test.ts
// 🧪 Tests para las nuevas funciones de códigos de pedido en pedidoHelpers

import {
  getCodigoPedidoRelevante,
  getTextoPorEstadoConCodigo,
  type EstadoPedidoItemResumen,
  type PedidoItemResumen
} from './pedidoHelpers'

// 🧪 Mock data para tests
const mockPedidoItem = (codigo: string, estado: string) => ({
  codigo,
  estado: estado as any,
  cantidad: 5,
  cantidadAtendida: 0
})

const mockResumenConPedidosActivos: PedidoItemResumen = {
  estado: 'pendiente' as EstadoPedidoItemResumen,
  totalPedidos: 3,
  cantidadTotalPedida: 15,
  cantidadTotalAtendida: 5,
  cantidadDisponible: 10,
  pedidosActivos: [
    mockPedidoItem('PED-001', 'enviado'),
    mockPedidoItem('PED-002', 'atendido')
  ],
  ultimoPedido: mockPedidoItem('PED-003', 'entregado')
}

const mockResumenSinPedidosActivos: PedidoItemResumen = {
  estado: 'sin_pedidos' as EstadoPedidoItemResumen,
  totalPedidos: 2,
  cantidadTotalPedida: 10,
  cantidadTotalAtendida: 10,
  cantidadDisponible: 5,
  pedidosActivos: [],
  ultimoPedido: mockPedidoItem('PED-005', 'cancelado')
}

const mockResumenMixto: PedidoItemResumen = {
  estado: 'parcial' as EstadoPedidoItemResumen,
  totalPedidos: 3,
  cantidadTotalPedida: 12,
  cantidadTotalAtendida: 7,
  cantidadDisponible: 8,
  pedidosActivos: [mockPedidoItem('PED-007', 'enviado')],
  ultimoPedido: mockPedidoItem('PED-008', 'cancelado')
}

describe('pedidoHelpers - Códigos de Pedido', () => {
  describe('getCodigoPedidoRelevante', () => {
    it('✅ should return the first active order code when multiple active orders exist', () => {
      const result = getCodigoPedidoRelevante(mockResumenConPedidosActivos)
      expect(result).toBe('PED-001') // First active order (enviado)
    })

    it('✅ should return the last order code when no active orders exist', () => {
      const result = getCodigoPedidoRelevante(mockResumenSinPedidosActivos)
      expect(result).toBe('PED-005') // Last order (ultimoPedido)
    })

    it('✅ should prioritize active orders over inactive ones', () => {
      const result = getCodigoPedidoRelevante(mockResumenMixto)
      expect(result).toBe('PED-007') // Active order (enviado) over inactive ones
    })

    it('✅ should return undefined for resumen without orders', () => {
      const emptyResumen: PedidoItemResumen = {
        estado: 'sin_pedidos',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 15,
        pedidosActivos: []
      }
      const result = getCodigoPedidoRelevante(emptyResumen)
      expect(result).toBeUndefined()
    })

    it('✅ should handle single order correctly', () => {
      const singleOrderResumen: PedidoItemResumen = {
        estado: 'pendiente',
        totalPedidos: 1,
        cantidadTotalPedida: 5,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 10,
        pedidosActivos: [mockPedidoItem('PED-SINGLE', 'borrador')]
      }
      const result = getCodigoPedidoRelevante(singleOrderResumen)
      expect(result).toBe('PED-SINGLE')
    })
  })

  describe('getTextoPorEstadoConCodigo', () => {
    it('✅ should return order code when orders exist', () => {
      const result = getTextoPorEstadoConCodigo('pendiente', mockResumenConPedidosActivos)
      expect(result).toBe('PED-001') // Should use the relevant order code
    })

    it('✅ should fallback to original text when no resumen provided', () => {
      const result = getTextoPorEstadoConCodigo('sin_pedidos')
      expect(result).toBe('Disponible') // Should use original estado text
    })

    it('✅ should fallback to original text when no relevant code found', () => {
      const emptyResumen: PedidoItemResumen = {
        estado: 'sin_pedidos',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 15,
        pedidosActivos: []
      }
      const result = getTextoPorEstadoConCodigo('pendiente', emptyResumen)
      expect(result).toBe('En Pedido') // Should fallback to original text
    })

    it('✅ should work with different estados', () => {
      expect(getTextoPorEstadoConCodigo('parcial', mockResumenMixto)).toBe('PED-007')
      expect(getTextoPorEstadoConCodigo('atendido', mockResumenMixto)).toBe('PED-007')
      expect(getTextoPorEstadoConCodigo('sin_pedidos')).toBe('Disponible')
      expect(getTextoPorEstadoConCodigo('entregado')).toBe('Entregado')
    })

    it('✅ should handle edge cases gracefully', () => {
      // Test with undefined/null resumen
      const result1 = getTextoPorEstadoConCodigo('pendiente', undefined as any)
      expect(result1).toBe('En Pedido')

      // Test with unknown estado
      const result2 = getTextoPorEstadoConCodigo('unknown_estado' as any, mockResumenConPedidosActivos)
      expect(result2).toBe('PED-001') // Should still return code if available
    })
  })

  describe('Integration Tests', () => {
    it('🔄 should work together in realistic scenarios', () => {
      // Scenario 1: Item with active orders
      const activeOrdersScenario: PedidoItemResumen = {
        estado: 'pendiente',
        totalPedidos: 3,
        cantidadTotalPedida: 15,
        cantidadTotalAtendida: 5,
        cantidadDisponible: 10,
        pedidosActivos: [mockPedidoItem('PED-101', 'enviado')],
        ultimoPedido: mockPedidoItem('PED-102', 'entregado')
      }
      
      const relevantCode = getCodigoPedidoRelevante(activeOrdersScenario)
      const displayText = getTextoPorEstadoConCodigo('pendiente', activeOrdersScenario)
      
      expect(relevantCode).toBe('PED-101') // Active order
      expect(displayText).toBe('PED-101') // Should show the code

      // Scenario 2: Item with only completed orders
      const completedOrdersScenario: PedidoItemResumen = {
        estado: 'sin_pedidos',
        totalPedidos: 2,
        cantidadTotalPedida: 10,
        cantidadTotalAtendida: 10,
        cantidadDisponible: 5,
        pedidosActivos: [],
        ultimoPedido: mockPedidoItem('PED-201', 'cancelado')
      }
      
      const relevantCode2 = getCodigoPedidoRelevante(completedOrdersScenario)
      const displayText2 = getTextoPorEstadoConCodigo('sin_pedidos', completedOrdersScenario)
      
      expect(relevantCode2).toBe('PED-201') // Last order
      expect(displayText2).toBe('PED-201') // Should show the code

      // Scenario 3: Item with no orders
      const noOrdersScenario: PedidoItemResumen = {
        estado: 'sin_pedidos',
        totalPedidos: 0,
        cantidadTotalPedida: 0,
        cantidadTotalAtendida: 0,
        cantidadDisponible: 15,
        pedidosActivos: []
      }
      
      const relevantCode3 = getCodigoPedidoRelevante(noOrdersScenario)
      const displayText3 = getTextoPorEstadoConCodigo('sin_pedidos', noOrdersScenario)
      
      expect(relevantCode3).toBeUndefined()
      expect(displayText3).toBe('Disponible') // Should fallback to original text
    })
  })
})
