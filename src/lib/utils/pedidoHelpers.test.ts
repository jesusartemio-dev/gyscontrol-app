// ===================================================
// 📁 Archivo: pedidoHelpers.test.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Tests para funciones helper de pedidos
// ===================================================

import {
  calcularResumenPedidos,
  getBadgeVariantPorEstado,
  getTextoPorEstado,
  getTextoPorEstadoConCodigo,
  getCodigoPedidoRelevante,
  getIdPedidoRelevante,
  getClasesFilaPorEstado,
  getInfoPedidosParaTooltip,
  tienePedidosActivos,
  estaDisponible,
  type EstadoPedidoItemResumen,
  type PedidoItemResumen
} from './pedidoHelpers'
import { ListaEquipoItem, PedidoEquipoItem, PedidoEquipo } from '@/types'

// 🧪 Mock data
const mockPedidoEquipo: PedidoEquipo = {
  id: 'pedido-1',
  codigo: 'STK01-PED-001',
  proyectoId: 'proyecto-1',
  listaId: 'lista-1',
  estado: 'pendiente',
  fechaNecesaria: '2024-02-15',
  comentarios: '',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

const mockPedidoEquipoItem: PedidoEquipoItem = {
  id: 'item-1',
  pedidoId: 'pedido-1',
  cantidadPedida: 5,
  cantidadAtendida: 2,
  estado: 'pendiente',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  pedido: mockPedidoEquipo
}

const mockListaEquipoItem: ListaEquipoItem = {
  id: 'lista-item-1',
  listaId: 'lista-1',
  codigo: 'EQ001',
  descripcion: 'Equipo de prueba',
  unidad: 'pza',
  cantidad: 10,
  estado: 'aprobado',
  origen: 'cotizado',
  verificado: true,
  pedidos: [mockPedidoEquipoItem]
}

const mockListaEquipoItemSinPedidos: ListaEquipoItem = {
  id: 'lista-item-2',
  listaId: 'lista-1',
  codigo: 'EQ002',
  descripcion: 'Equipo sin pedidos',
  unidad: 'pza',
  cantidad: 5,
  estado: 'aprobado',
  origen: 'nuevo',
  verificado: false,
  pedidos: []
}

describe('pedidoHelpers', () => {
  describe('calcularResumenPedidos', () => {
    it('should calculate summary for item with orders', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItem)
      
      expect(resumen.totalPedidos).toBe(1)
      expect(resumen.cantidadTotalPedida).toBe(5)
      expect(resumen.cantidadTotalAtendida).toBe(2)
      expect(resumen.pedidosActivos).toHaveLength(1)
      expect(resumen.ultimoPedido).toBe(mockPedidoEquipoItem)
      expect(resumen.estado).toBe('pendiente')
    })

    it('should return empty summary for item without orders', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItemSinPedidos)
      
      expect(resumen.totalPedidos).toBe(0)
      expect(resumen.cantidadTotalPedida).toBe(0)
      expect(resumen.cantidadTotalAtendida).toBe(0)
      expect(resumen.pedidosActivos).toHaveLength(0)
      expect(resumen.ultimoPedido).toBeUndefined()
      expect(resumen.estado).toBe('sin_pedidos')
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

  describe('getTextoPorEstado', () => {
    it('should return correct text for each state', () => {
      expect(getTextoPorEstado('pendiente')).toBe('Pendiente')
      expect(getTextoPorEstado('atendido')).toBe('Atendido')
      expect(getTextoPorEstado('parcial')).toBe('Parcial')
      expect(getTextoPorEstado('sin_pedidos')).toBe('Sin pedidos')
    })
  })

  describe('getCodigoPedidoRelevante', () => {
    it('should return order code from active orders', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItem)
      const codigo = getCodigoPedidoRelevante(resumen)
      
      expect(codigo).toBe('STK01-PED-001')
    })

    it('should return undefined for empty summary', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItemSinPedidos)
      const codigo = getCodigoPedidoRelevante(resumen)
      
      expect(codigo).toBeUndefined()
    })
  })

  describe('getIdPedidoRelevante', () => {
    it('should return order ID from active orders', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItem)
      const pedidoId = getIdPedidoRelevante(resumen)
      
      expect(pedidoId).toBe('pedido-1')
    })

    it('should return undefined for empty summary', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItemSinPedidos)
      const pedidoId = getIdPedidoRelevante(resumen)
      
      expect(pedidoId).toBeUndefined()
    })
  })

  describe('getTextoPorEstadoConCodigo', () => {
    it('should return order code with quantity when available', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItem)
      const texto = getTextoPorEstadoConCodigo('pendiente', resumen)
      
      expect(texto).toBe('STK01-PED-001\n5/10')
    })

    it('should fallback to state text when no orders', () => {
      const resumen = calcularResumenPedidos(mockListaEquipoItemSinPedidos)
      const texto = getTextoPorEstadoConCodigo('sin_pedidos', resumen)
      
      expect(texto).toBe('Sin pedidos')
    })

    it('should fallback to state text when no summary provided', () => {
      const texto = getTextoPorEstadoConCodigo('pendiente')
      
      expect(texto).toBe('Pendiente')
    })
  })

  describe('getClasesFilaPorEstado', () => {
    it('should return correct CSS classes for each state', () => {
      expect(getClasesFilaPorEstado('pendiente')).toContain('border-l-yellow-400')
      expect(getClasesFilaPorEstado('atendido')).toContain('border-l-green-400')
      expect(getClasesFilaPorEstado('parcial')).toContain('border-l-blue-400')
      expect(getClasesFilaPorEstado('sin_pedidos')).toContain('border-l-gray-300')
    })
  })

  describe('tienePedidosActivos', () => {
    it('should return true for item with active orders', () => {
      expect(tienePedidosActivos(mockListaEquipoItem)).toBe(true)
    })

    it('should return false for item without orders', () => {
      expect(tienePedidosActivos(mockListaEquipoItemSinPedidos)).toBe(false)
    })
  })

  describe('estaDisponible', () => {
    it('should return true for available item', () => {
      expect(estaDisponible(mockListaEquipoItem)).toBe(true)
    })

    it('should return false for unavailable item', () => {
      const itemNoDisponible = {
        ...mockListaEquipoItem,
        estado: 'rechazado' as const
      }
      expect(estaDisponible(itemNoDisponible)).toBe(false)
    })
  })

  describe('getInfoPedidosParaTooltip', () => {
    it('should return formatted tooltip info for item with orders', () => {
      const info = getInfoPedidosParaTooltip(mockListaEquipoItem)
      
      expect(info).toContain('Total pedidos: 1')
      expect(info).toContain('Cantidad pedida: 5')
      expect(info).toContain('Cantidad atendida: 2')
      expect(info).toContain('Estado: Pendiente')
    })

    it('should return no orders info for item without orders', () => {
      const info = getInfoPedidosParaTooltip(mockListaEquipoItemSinPedidos)
      
      expect(info).toContain('Sin pedidos registrados')
    })
  })
})
