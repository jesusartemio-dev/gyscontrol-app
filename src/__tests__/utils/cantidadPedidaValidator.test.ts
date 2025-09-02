// ===================================================
// 📁 Archivo: cantidadPedidaValidator.test.ts
// 📌 Ubicación: src/__tests__/utils/
// 🔧 Descripción: Tests para validador de cantidadPedida
// 📌 Características: Valida funciones de sincronización y recálculo
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  recalcularCantidadPedida,
  validarCantidadPedidaNoNegativa,
  sincronizarCantidadPedida,
  obtenerEstadisticasConsistencia,
  repararInconsistencias
} from '@/lib/utils/cantidadPedidaValidator'

// 🎭 Mock Prisma
const mockPrisma = {
  pedidoEquipoItem: {
    findMany: jest.fn(),
  },
  listaEquipoItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}

// 🔧 Mock del módulo prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('cantidadPedidaValidator', () => {
  beforeEach(() => {
    // 🧹 Limpiar mocks antes de cada test
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('recalcularCantidadPedida', () => {
    it('should recalculate cantidadPedida correctly', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      const mockPedidos = [
        { cantidadPedida: 5 },
        { cantidadPedida: 3 },
        { cantidadPedida: 2 },
      ]

      mockPrisma.pedidoEquipoItem.findMany.mockResolvedValue(mockPedidos)
      mockPrisma.listaEquipoItem.update.mockResolvedValue({ cantidadPedida: 10 })

      // 🎬 Act
      const resultado = await recalcularCantidadPedida(listaEquipoItemId)

      // ✅ Assert
      expect(resultado).toBe(10)
      expect(mockPrisma.pedidoEquipoItem.findMany).toHaveBeenCalledWith({
        where: { listaEquipoItemId },
        select: { cantidadPedida: true }
      })
      expect(mockPrisma.listaEquipoItem.update).toHaveBeenCalledWith({
        where: { id: listaEquipoItemId },
        data: { cantidadPedida: 10 }
      })
    })

    it('should handle null cantidadPedida values', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-2'
      const mockPedidos = [
        { cantidadPedida: 5 },
        { cantidadPedida: null },
        { cantidadPedida: 3 },
      ]

      mockPrisma.pedidoEquipoItem.findMany.mockResolvedValue(mockPedidos)
      mockPrisma.listaEquipoItem.update.mockResolvedValue({ cantidadPedida: 8 })

      // 🎬 Act
      const resultado = await recalcularCantidadPedida(listaEquipoItemId)

      // ✅ Assert
      expect(resultado).toBe(8) // 5 + 0 + 3 = 8
    })

    it('should handle empty pedidos array', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-3'
      mockPrisma.pedidoEquipoItem.findMany.mockResolvedValue([])
      mockPrisma.listaEquipoItem.update.mockResolvedValue({ cantidadPedida: 0 })

      // 🎬 Act
      const resultado = await recalcularCantidadPedida(listaEquipoItemId)

      // ✅ Assert
      expect(resultado).toBe(0)
    })

    it('should throw error on database failure', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-error'
      mockPrisma.pedidoEquipoItem.findMany.mockRejectedValue(new Error('Database error'))

      // 🎬 Act & Assert
      await expect(recalcularCantidadPedida(listaEquipoItemId))
        .rejects.toThrow('Error al recalcular cantidadPedida para item item-error')
    })
  })

  describe('validarCantidadPedidaNoNegativa', () => {
    it('should validate that operation will not result in negative value', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      const cantidadADecrementar = 3
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue({
        cantidadPedida: 5,
        cantidad: 10
      })

      // 🎬 Act
      const resultado = await validarCantidadPedidaNoNegativa(listaEquipoItemId, cantidadADecrementar)

      // ✅ Assert
      expect(resultado).toEqual({
        esValida: true,
        cantidadActual: 5,
        cantidadResultante: 2
      })
    })

    it('should detect when operation would result in negative value', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      const cantidadADecrementar = 8
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue({
        cantidadPedida: 5,
        cantidad: 10
      })

      // 🎬 Act
      const resultado = await validarCantidadPedidaNoNegativa(listaEquipoItemId, cantidadADecrementar)

      // ✅ Assert
      expect(resultado).toEqual({
        esValida: false,
        cantidadActual: 5,
        cantidadResultante: -3
      })
    })

    it('should handle null cantidadPedida', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      const cantidadADecrementar = 2
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue({
        cantidadPedida: null,
        cantidad: 10
      })

      // 🎬 Act
      const resultado = await validarCantidadPedidaNoNegativa(listaEquipoItemId, cantidadADecrementar)

      // ✅ Assert
      expect(resultado).toEqual({
        esValida: false,
        cantidadActual: 0,
        cantidadResultante: -2
      })
    })

    it('should throw error when item not found', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-not-found'
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue(null)

      // 🎬 Act & Assert
      await expect(validarCantidadPedidaNoNegativa(listaEquipoItemId, 5))
        .rejects.toThrow('ListaEquipoItem con ID item-not-found no encontrado')
    })
  })

  describe('sincronizarCantidadPedida', () => {
    it('should successfully increment cantidadPedida', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      mockPrisma.listaEquipoItem.update.mockResolvedValue({ cantidadPedida: 8 })

      // 🎬 Act
      const resultado = await sincronizarCantidadPedida(listaEquipoItemId, 'increment', 3)

      // ✅ Assert
      expect(resultado).toEqual({
        exito: true,
        cantidadFinal: 8
      })
      expect(mockPrisma.listaEquipoItem.update).toHaveBeenCalledWith({
        where: { id: listaEquipoItemId },
        data: { cantidadPedida: { increment: 3 } },
        select: { cantidadPedida: true }
      })
    })

    it('should successfully decrement cantidadPedida when valid', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue({
        cantidadPedida: 10,
        cantidad: 15
      })
      mockPrisma.listaEquipoItem.update.mockResolvedValue({ cantidadPedida: 7 })

      // 🎬 Act
      const resultado = await sincronizarCantidadPedida(listaEquipoItemId, 'decrement', 3)

      // ✅ Assert
      expect(resultado).toEqual({
        exito: true,
        cantidadFinal: 7
      })
    })

    it('should reject decrement that would result in negative value', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue({
        cantidadPedida: 5,
        cantidad: 10
      })

      // 🎬 Act
      const resultado = await sincronizarCantidadPedida(listaEquipoItemId, 'decrement', 8)

      // ✅ Assert
      expect(resultado).toEqual({
        exito: false,
        cantidadFinal: 5,
        mensaje: 'La operación resultaría en cantidad negativa. Actual: 5, Intentando decrementar: 8'
      })
      expect(mockPrisma.listaEquipoItem.update).not.toHaveBeenCalled()
    })

    it('should reject zero or negative cantidad', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'

      // 🎬 Act
      const resultado = await sincronizarCantidadPedida(listaEquipoItemId, 'increment', 0)

      // ✅ Assert
      expect(resultado).toEqual({
        exito: false,
        cantidadFinal: 0,
        mensaje: 'La cantidad debe ser mayor a 0'
      })
    })

    it('should handle database errors gracefully', async () => {
      // 📋 Arrange
      const listaEquipoItemId = 'item-1'
      mockPrisma.listaEquipoItem.update.mockRejectedValue(new Error('Database error'))

      // 🎬 Act
      const resultado = await sincronizarCantidadPedida(listaEquipoItemId, 'increment', 3)

      // ✅ Assert
      expect(resultado.exito).toBe(false)
      expect(resultado.cantidadFinal).toBe(0)
      expect(resultado.mensaje).toContain('Error interno')
    })
  })

  describe('obtenerEstadisticasConsistencia', () => {
    it('should calculate consistency statistics correctly', async () => {
      // 📋 Arrange
      const mockItems = [
        {
          id: 'item-1',
          cantidadPedida: 5,
          pedidos: [{ cantidadPedida: 3 }, { cantidadPedida: 2 }] // Suma = 5 (consistente)
        },
        {
          id: 'item-2',
          cantidadPedida: 8,
          pedidos: [{ cantidadPedida: 5 }] // Suma = 5 (inconsistente)
        },
        {
          id: 'item-3',
          cantidadPedida: -2, // Negativo
          pedidos: [{ cantidadPedida: 1 }]
        },
        {
          id: 'item-4',
          cantidadPedida: 0,
          pedidos: [] // Suma = 0 (consistente)
        }
      ]

      mockPrisma.listaEquipoItem.findMany.mockResolvedValue(mockItems)

      // 🎬 Act
      const estadisticas = await obtenerEstadisticasConsistencia()

      // ✅ Assert
      expect(estadisticas).toEqual({
        totalItems: 4,
        itemsConsistentes: 2, // item-1 y item-4
        itemsInconsistentes: 2, // item-2 y item-3
        itemsNegativos: 1, // item-3
        porcentajeConsistencia: 50 // 2/4 * 100
      })
    })

    it('should handle empty items array', async () => {
      // 📋 Arrange
      mockPrisma.listaEquipoItem.findMany.mockResolvedValue([])

      // 🎬 Act
      const estadisticas = await obtenerEstadisticasConsistencia()

      // ✅ Assert
      expect(estadisticas).toEqual({
        totalItems: 0,
        itemsConsistentes: 0,
        itemsInconsistentes: 0,
        itemsNegativos: 0,
        porcentajeConsistencia: 100
      })
    })
  })

  describe('repararInconsistencias', () => {
    it('should repair inconsistent items successfully', async () => {
      // 📋 Arrange
      const mockItems = [
        {
          id: 'item-1',
          cantidadPedida: 5,
          pedidos: [{ cantidadPedida: 3 }, { cantidadPedida: 2 }] // Consistente
        },
        {
          id: 'item-2',
          cantidadPedida: 8,
          pedidos: [{ cantidadPedida: 5 }] // Inconsistente: debería ser 5
        },
        {
          id: 'item-3',
          cantidadPedida: -2,
          pedidos: [{ cantidadPedida: 1 }] // Inconsistente: debería ser 1
        }
      ]

      mockPrisma.listaEquipoItem.findMany.mockResolvedValue(mockItems)
      mockPrisma.listaEquipoItem.update.mockResolvedValue({})

      // 🎬 Act
      const resultado = await repararInconsistencias()

      // ✅ Assert
      expect(resultado.itemsReparados).toBe(2)
      expect(resultado.errores).toHaveLength(0)
      
      // Verificar que se actualizaron los items inconsistentes
      expect(mockPrisma.listaEquipoItem.update).toHaveBeenCalledWith({
        where: { id: 'item-2' },
        data: { cantidadPedida: 5 }
      })
      expect(mockPrisma.listaEquipoItem.update).toHaveBeenCalledWith({
        where: { id: 'item-3' },
        data: { cantidadPedida: 1 }
      })
    })

    it('should handle update errors gracefully', async () => {
      // 📋 Arrange
      const mockItems = [
        {
          id: 'item-error',
          cantidadPedida: 8,
          pedidos: [{ cantidadPedida: 5 }]
        }
      ]

      mockPrisma.listaEquipoItem.findMany.mockResolvedValue(mockItems)
      mockPrisma.listaEquipoItem.update.mockRejectedValue(new Error('Update failed'))

      // 🎬 Act
      const resultado = await repararInconsistencias()

      // ✅ Assert
      expect(resultado.itemsReparados).toBe(0)
      expect(resultado.errores).toHaveLength(1)
      expect(resultado.errores[0]).toContain('Error reparando item item-error')
    })
  })
})