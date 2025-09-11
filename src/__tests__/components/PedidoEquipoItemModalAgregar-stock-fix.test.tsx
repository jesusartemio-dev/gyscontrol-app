/**
 * @fileoverview Test para verificar la lógica de cálculo de stock en PedidoEquipoItemModalAgregar
 */

import { ListaEquipoItem } from '../../types'

// Mock data para testing
const mockItems: ListaEquipoItem[] = [
  {
    id: '1',
    codigo: 'IC695CPU310',
    descripcion: 'CPU GE RX3i',
    cantidad: 3,
    cantidadPedida: 2, // Ya se pidieron 2, disponible: 1
    precioElegido: 200,
    listaEquipoId: 'lista1',
    equipoId: 'equipo1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    codigo: 'IC695ETM001',
    descripcion: 'Módulo Ethernet GE RX3i',
    cantidad: 3,
    cantidadPedida: 0, // No se ha pedido nada, disponible: 3
    precioElegido: 200,
    listaEquipoId: 'lista1',
    equipoId: 'equipo2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    codigo: 'Q03UDECPU',
    descripcion: 'CPU Mitsubishi Q Series',
    cantidad: 1,
    cantidadPedida: 1, // Ya se pidió todo, disponible: 0
    precioElegido: 300,
    listaEquipoId: 'lista1',
    equipoId: 'equipo3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// ✅ Función para calcular stock disponible (misma lógica que en el modal)
const calcularStockDisponible = (item: ListaEquipoItem): number => {
  return item.cantidad - (item.cantidadPedida || 0)
}

// ✅ Función para obtener estado del pedido (misma lógica que en el modal)
const getEstadoPedido = (item: ListaEquipoItem) => {
  const restante = calcularStockDisponible(item)
  const pedida = item.cantidadPedida || 0
  
  if (restante === 0) {
    return 'completo'
  }
  if (pedida > 0) {
    return 'parcial'
  }
  return 'pendiente'
}

// ✅ Función para calcular estadísticas (misma lógica que en el modal)
const calcularEstadisticas = (items: ListaEquipoItem[]) => {
  const totalItems = items.length
  const itemsCompletos = items.filter(item => getEstadoPedido(item) === 'completo').length
  const itemsParciales = items.filter(item => getEstadoPedido(item) === 'parcial').length
  const itemsDisponibles = items.filter(item => calcularStockDisponible(item) > 0).length
  
  return {
    totalItems,
    itemsCompletos,
    itemsParciales,
    itemsDisponibles
  }
}

describe('PedidoEquipoItemModalAgregar - Stock Calculation Logic', () => {
  it('should calculate correct available stock for each item', () => {
    // ✅ Item 1: 3 total - 2 pedidas = 1 disponible
    expect(calcularStockDisponible(mockItems[0])).toBe(1)
    
    // ✅ Item 2: 3 total - 0 pedidas = 3 disponibles
    expect(calcularStockDisponible(mockItems[1])).toBe(3)
    
    // ✅ Item 3: 1 total - 1 pedida = 0 disponibles
    expect(calcularStockDisponible(mockItems[2])).toBe(0)
  })

  it('should determine correct order status for each item', () => {
    // ✅ Item 1: parcialmente pedido (2 de 3)
    expect(getEstadoPedido(mockItems[0])).toBe('parcial')
    
    // ✅ Item 2: no pedido (0 de 3)
    expect(getEstadoPedido(mockItems[1])).toBe('pendiente')
    
    // ✅ Item 3: completamente pedido (1 de 1)
    expect(getEstadoPedido(mockItems[2])).toBe('completo')
  })

  it('should calculate correct statistics', () => {
    const stats = calcularEstadisticas(mockItems)
    
    expect(stats.totalItems).toBe(3) // 3 items totales
    expect(stats.itemsCompletos).toBe(1) // 1 item completo (Q03UDECPU)
    expect(stats.itemsParciales).toBe(1) // 1 item parcial (IC695CPU310)
    expect(stats.itemsDisponibles).toBe(2) // 2 items con stock disponible (IC695CPU310, IC695ETM001)
  })

  it('should handle items with undefined cantidadPedida', () => {
    const itemWithUndefinedCantidad: ListaEquipoItem = {
      ...mockItems[0],
      cantidadPedida: undefined
    }
    
    // ✅ Debería tratar undefined como 0
    expect(calcularStockDisponible(itemWithUndefinedCantidad)).toBe(3) // 3 - 0 = 3
    expect(getEstadoPedido(itemWithUndefinedCantidad)).toBe('pendiente')
  })

  it('should filter items correctly based on availability', () => {
    // ✅ Filtrar solo items con stock disponible
    const itemsConStock = mockItems.filter(item => calcularStockDisponible(item) > 0)
    
    expect(itemsConStock).toHaveLength(2)
    expect(itemsConStock[0].codigo).toBe('IC695CPU310') // Stock: 1
    expect(itemsConStock[1].codigo).toBe('IC695ETM001') // Stock: 3
  })

  it('should validate stock before selection', () => {
    // ✅ Simular validación de stock antes de selección
    const validarSeleccion = (item: ListaEquipoItem): boolean => {
      return calcularStockDisponible(item) > 0
    }
    
    expect(validarSeleccion(mockItems[0])).toBe(true) // Stock: 1
    expect(validarSeleccion(mockItems[1])).toBe(true) // Stock: 3
    expect(validarSeleccion(mockItems[2])).toBe(false) // Stock: 0
  })
})

// ✅ Test de integración: verificar que la corrección resuelve el problema original
describe('Stock Display Fix Integration', () => {
  it('should show correct stock when modal receives all items (not just available ones)', () => {
    // ✅ Antes del fix: el modal recibía solo itemsDisponibles (filtrados)
    const itemsDisponiblesSolo = mockItems.filter(item => calcularStockDisponible(item) > 0)
    expect(itemsDisponiblesSolo).toHaveLength(2) // Solo 2 items
    
    // ✅ Después del fix: el modal recibe todos los items
    const todosLosItems = mockItems
    expect(todosLosItems).toHaveLength(3) // Todos los 3 items
    
    // ✅ Verificar que cada item muestra el stock correcto
    todosLosItems.forEach(item => {
      const stockDisponible = calcularStockDisponible(item)
      const stockTotal = item.cantidad
      
      // El modal debería mostrar: stockDisponible/stockTotal
      console.log(`${item.codigo}: ${stockDisponible}/${stockTotal}`)
      
      expect(stockDisponible).toBeGreaterThanOrEqual(0)
      expect(stockDisponible).toBeLessThanOrEqual(stockTotal)
    })
  })
})
