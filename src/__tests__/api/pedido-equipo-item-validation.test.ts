// ===================================================
// 📁 Archivo: pedido-equipo-item-validation.test.ts
// 📌 Ubicación: src/__tests__/api/
// 🔧 Descripción: Tests de integración para validación de cantidadPedida en APIs
// 📌 Características: Valida que las APIs prevengan valores negativos
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, PUT, DELETE } from '@/app/api/pedido-equipo-item/route'
import { PUT as PUT_ID, DELETE as DELETE_ID } from '@/app/api/pedido-equipo-item/[id]/route'

// 🎭 Mock Prisma y validador
const mockPrisma = {
  pedidoEquipoItem: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  listaEquipoItem: {
    update: jest.fn(),
  },
}

const mockValidator = {
  sincronizarCantidadPedida: jest.fn(),
  recalcularCantidadPedida: jest.fn(),
}

// 🔧 Mock de módulos
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/utils/cantidadPedidaValidator', () => mockValidator)

describe('PedidoEquipoItem API Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('POST /api/pedido-equipo-item', () => {
    it('should create item and sync cantidadPedida successfully', async () => {
      // 📋 Arrange
      const mockPayload = {
        pedidoId: 'pedido-1',
        listaId: 'lista-1',
        listaEquipoItemId: 'item-1',
        responsableId: 'user-1',
        codigo: 'TEST-001',
        descripcion: 'Test Item',
        unidad: 'UND',
        cantidadPedida: 5,
        precioUnitario: 100,
        costoTotal: 500,
      }

      const mockCreatedItem = { id: 'new-item-1', ...mockPayload }
      
      mockPrisma.pedidoEquipoItem.create.mockResolvedValue(mockCreatedItem)
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: true,
        cantidadFinal: 10
      })

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(mockPayload),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(mockCreatedItem)
      expect(mockValidator.sincronizarCantidadPedida).toHaveBeenCalledWith(
        'item-1',
        'increment',
        5
      )
    })

    it('should handle sync failure and recalculate', async () => {
      // 📋 Arrange
      const mockPayload = {
        pedidoId: 'pedido-1',
        listaId: 'lista-1',
        listaEquipoItemId: 'item-1',
        responsableId: 'user-1',
        codigo: 'TEST-001',
        descripcion: 'Test Item',
        unidad: 'UND',
        cantidadPedida: 5,
        precioUnitario: 100,
        costoTotal: 500,
      }

      const mockCreatedItem = { id: 'new-item-1', ...mockPayload }
      
      mockPrisma.pedidoEquipoItem.create.mockResolvedValue(mockCreatedItem)
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: false,
        cantidadFinal: 0,
        mensaje: 'Error de sincronización'
      })
      mockValidator.recalcularCantidadPedida.mockResolvedValue(5)

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(mockPayload),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await POST(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockValidator.recalcularCantidadPedida).toHaveBeenCalledWith('item-1')
    })
  })

  describe('PUT /api/pedido-equipo-item/[id]', () => {
    it('should update item and sync cantidadPedida correctly', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItemAnterior = {
        id: itemId,
        cantidadPedida: 5,
        listaEquipoItemId: 'lista-item-1',
        pedido: { fechaNecesaria: new Date('2025-02-01') }
      }
      
      const mockUpdatePayload = {
        cantidadPedida: 8, // Incremento de 3
        tiempoEntregaDias: 10
      }

      const mockUpdatedItem = { ...mockItemAnterior, ...mockUpdatePayload }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItemAnterior)
      mockPrisma.pedidoEquipoItem.update.mockResolvedValue(mockUpdatedItem)
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: true,
        cantidadFinal: 13
      })
      mockValidator.recalcularCantidadPedida.mockResolvedValue(8)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await PUT_ID(request, { params: Promise.resolve({ id: itemId }) })

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockValidator.sincronizarCantidadPedida).toHaveBeenCalledWith(
        'lista-item-1',
        'increment',
        3 // diferencia
      )
      expect(mockValidator.recalcularCantidadPedida).toHaveBeenCalledWith('lista-item-1')
    })

    it('should handle decrement operation correctly', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItemAnterior = {
        id: itemId,
        cantidadPedida: 8,
        listaEquipoItemId: 'lista-item-1',
        pedido: { fechaNecesaria: new Date('2025-02-01') }
      }
      
      const mockUpdatePayload = {
        cantidadPedida: 5, // Decremento de 3
      }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItemAnterior)
      mockPrisma.pedidoEquipoItem.update.mockResolvedValue({ ...mockItemAnterior, ...mockUpdatePayload })
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: true,
        cantidadFinal: 10
      })
      mockValidator.recalcularCantidadPedida.mockResolvedValue(5)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await PUT_ID(request, { params: Promise.resolve({ id: itemId }) })

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockValidator.sincronizarCantidadPedida).toHaveBeenCalledWith(
        'lista-item-1',
        'decrement',
        3 // diferencia absoluta
      )
    })

    it('should return 404 when item not found', async () => {
      // 📋 Arrange
      const itemId = 'item-not-found'
      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ cantidadPedida: 5 }),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await PUT_ID(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Ítem no encontrado para actualizar')
    })

    it('should return 400 when cantidadPedida is missing', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItemAnterior = {
        id: itemId,
        cantidadPedida: 5,
        listaEquipoItemId: 'lista-item-1'
      }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItemAnterior)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ descripcion: 'Updated description' }),
        headers: { 'Content-Type': 'application/json' }
      })

      // 🎬 Act
      const response = await PUT_ID(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('La cantidadPedida es requerida')
    })
  })

  describe('DELETE /api/pedido-equipo-item/[id]', () => {
    it('should delete item and sync cantidadPedida correctly', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItem = {
        id: itemId,
        cantidadPedida: 5,
        listaEquipoItemId: 'lista-item-1'
      }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItem)
      mockPrisma.pedidoEquipoItem.delete.mockResolvedValue(mockItem)
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: true,
        cantidadFinal: 8
      })
      mockValidator.recalcularCantidadPedida.mockResolvedValue(3)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'DELETE'
      })

      // 🎬 Act
      const response = await DELETE_ID(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('OK')
      expect(mockValidator.sincronizarCantidadPedida).toHaveBeenCalledWith(
        'lista-item-1',
        'decrement',
        5
      )
      expect(mockPrisma.pedidoEquipoItem.delete).toHaveBeenCalledWith({ where: { id: itemId } })
      expect(mockValidator.recalcularCantidadPedida).toHaveBeenCalledWith('lista-item-1')
    })

    it('should handle sync failure and still delete item', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItem = {
        id: itemId,
        cantidadPedida: 5,
        listaEquipoItemId: 'lista-item-1'
      }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItem)
      mockPrisma.pedidoEquipoItem.delete.mockResolvedValue(mockItem)
      mockValidator.sincronizarCantidadPedida.mockResolvedValue({
        exito: false,
        cantidadFinal: 0,
        mensaje: 'Error de sincronización'
      })
      mockValidator.recalcularCantidadPedida.mockResolvedValue(0)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'DELETE'
      })

      // 🎬 Act
      const response = await DELETE_ID(request, { params: Promise.resolve({ id: itemId }) })

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.pedidoEquipoItem.delete).toHaveBeenCalled()
      expect(mockValidator.recalcularCantidadPedida).toHaveBeenCalledTimes(2) // Una por fallo, otra por recálculo final
    })

    it('should return 404 when item not found', async () => {
      // 📋 Arrange
      const itemId = 'item-not-found'
      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'DELETE'
      })

      // 🎬 Act
      const response = await DELETE_ID(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Ítem no encontrado para eliminar')
      expect(mockPrisma.pedidoEquipoItem.delete).not.toHaveBeenCalled()
    })

    it('should handle items without listaEquipoItemId', async () => {
      // 📋 Arrange
      const itemId = 'item-1'
      const mockItem = {
        id: itemId,
        cantidadPedida: 5,
        listaEquipoItemId: null // Sin vinculación a lista
      }

      mockPrisma.pedidoEquipoItem.findUnique.mockResolvedValue(mockItem)
      mockPrisma.pedidoEquipoItem.delete.mockResolvedValue(mockItem)

      const request = new NextRequest(`http://localhost:3000/api/pedido-equipo-item/${itemId}`, {
        method: 'DELETE'
      })

      // 🎬 Act
      const response = await DELETE_ID(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('OK')
      expect(mockValidator.sincronizarCantidadPedida).not.toHaveBeenCalled()
      expect(mockValidator.recalcularCantidadPedida).not.toHaveBeenCalled()
      expect(mockPrisma.pedidoEquipoItem.delete).toHaveBeenCalledWith({ where: { id: itemId } })
    })
  })
})
