// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Ubicación: src/app/api/pedido-equipo/desde-lista/__tests__/
// 🔧 Descripción: Tests para la API de creación de pedidos desde lista
// 🧠 Uso: Validar funcionalidad del endpoint de creación contextual
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { jest } from '@jest/globals'

// 🎭 Mock de Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findUnique: jest.fn()
    },
    pedidoEquipo: {
      create: jest.fn(),
      findUnique: jest.fn()
    },
    pedidoEquipoItem: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

// 🎭 Mock del logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

// 📊 Datos de prueba
const mockListaConItems = {
  id: 'lista-1',
  nombre: 'Lista Test',
  items: [
    {
      id: 'item-1',
      catalogoEquipoId: 'equipo-1',
      cantidad: 10,
      costoUnitario: 100,
      catalogoEquipo: {
        id: 'equipo-1',
        nombre: 'Equipo Test 1',
        tiempoEntregaDias: 15
      }
    },
    {
      id: 'item-2',
      catalogoEquipoId: 'equipo-2',
      cantidad: 5,
      costoUnitario: 200,
      catalogoEquipo: {
        id: 'equipo-2',
        nombre: 'Equipo Test 2',
        tiempoEntregaDias: 20
      }
    }
  ]
}

const mockPedidoCreado = {
  id: 'pedido-1',
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  listaId: 'lista-1',
  costoTotal: 300,
  estado: 'pendiente'
}

const mockPedidoCompleto = {
  ...mockPedidoCreado,
  proyecto: { id: 'proyecto-1', nombre: 'Proyecto Test' },
  responsable: { id: 'user-1', nombre: 'Usuario Test' },
  lista: { id: 'lista-1', nombre: 'Lista Test' },
  items: [
    {
      id: 'pedido-item-1',
      pedidoEquipoId: 'pedido-1',
      catalogoEquipoId: 'equipo-1',
      cantidad: 2,
      costoUnitario: 100,
      costoTotal: 200
    }
  ]
}

const validPayload = {
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  listaId: 'lista-1',
  fechaNecesaria: '2025-02-15',
  observacion: 'Pedido de prueba',
  prioridad: 'media' as const,
  esUrgente: false,
  itemsSeleccionados: [
    {
      listaEquipoItemId: 'item-1',
      cantidadPedida: 2
    }
  ]
}

describe('/api/pedido-equipo/desde-lista POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test 1: Crear pedido exitosamente
  it('should create order successfully with valid payload', async () => {
    // Setup mocks
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(mockListaConItems)
    ;(prisma.$transaction as jest.Mock).mockResolvedValue({
      pedido: mockPedidoCreado,
      items: [{ id: 'pedido-item-1' }]
    })
    ;(prisma.pedidoEquipo.findUnique as jest.Mock).mockResolvedValue(mockPedidoCompleto)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('pedido-1')
    expect(data.costoTotal).toBe(300)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  // ✅ Test 2: Validar datos requeridos
  it('should return 400 when required fields are missing', async () => {
    const invalidPayload = {
      proyectoId: 'proyecto-1'
      // Missing responsableId, listaId, itemsSeleccionados
    }

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(invalidPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Faltan datos requeridos')
  })

  // ✅ Test 3: Validar items seleccionados
  it('should return 400 when no items are selected', async () => {
    const payloadSinItems = {
      ...validPayload,
      itemsSeleccionados: []
    }

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(payloadSinItems)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Debe seleccionar al menos un item')
  })

  // ✅ Test 4: Lista no encontrada
  it('should return 404 when list is not found', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('Lista técnica no encontrada')
  })

  // ✅ Test 5: Validar items pertenecen a la lista
  it('should return 400 when selected items do not belong to list', async () => {
    const listaConOtrosItems = {
      ...mockListaConItems,
      items: [
        {
          id: 'item-diferente',
          catalogoEquipoId: 'equipo-diferente',
          cantidad: 5,
          costoUnitario: 50
        }
      ]
    }

    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(listaConOtrosItems)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('no pertenecen a la lista')
  })

  // ✅ Test 6: Validar cantidades disponibles
  it('should return 400 when requested quantity exceeds available', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(mockListaConItems)

    const payloadCantidadExcesiva = {
      ...validPayload,
      itemsSeleccionados: [
        {
          listaEquipoItemId: 'item-1',
          cantidadPedida: 15 // Excede la cantidad disponible (10)
        }
      ]
    }

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(payloadCantidadExcesiva)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Cantidad solicitada (15) excede la disponible (10)')
  })

  // ✅ Test 7: Calcular totales correctamente
  it('should calculate totals correctly', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(mockListaConItems)
    
    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      const tx = {
        pedidoEquipo: {
          create: jest.fn().mockResolvedValue(mockPedidoCreado)
        },
        pedidoEquipoItem: {
          create: jest.fn().mockResolvedValue({ id: 'item-created' })
        }
      }
      return await callback(tx)
    })
    
    ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransaction)
    ;(prisma.pedidoEquipo.findUnique as jest.Mock).mockResolvedValue(mockPedidoCompleto)

    const payloadMultiplesItems = {
      ...validPayload,
      itemsSeleccionados: [
        {
          listaEquipoItemId: 'item-1',
          cantidadPedida: 2 // 2 * 100 = 200
        },
        {
          listaEquipoItemId: 'item-2',
          cantidadPedida: 1 // 1 * 200 = 200
        }
      ]
    }

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(payloadMultiplesItems)
    })

    const response = await POST(request)
    
    expect(response.status).toBe(201)
    
    // Verificar que se llamó la transacción con el costo total correcto
    const transactionCall = (prisma.$transaction as jest.Mock).mock.calls[0][0]
    const mockTx = {
      pedidoEquipo: {
        create: jest.fn().mockResolvedValue(mockPedidoCreado)
      },
      pedidoEquipoItem: {
        create: jest.fn().mockResolvedValue({ id: 'item-created' })
      }
    }
    
    await transactionCall(mockTx)
    
    const createPedidoCall = mockTx.pedidoEquipo.create.mock.calls[0][0]
    expect(createPedidoCall.data.costoTotal).toBe(400) // 200 + 200
  })

  // ✅ Test 8: Manejar errores de base de datos
  it('should handle database errors gracefully', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.message).toBe('Error interno del servidor')
  })

  // ✅ Test 9: Validar fechas esperadas
  it('should calculate expected dates based on delivery time', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(mockListaConItems)
    
    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      const tx = {
        pedidoEquipo: {
          create: jest.fn().mockResolvedValue(mockPedidoCreado)
        },
        pedidoEquipoItem: {
          create: jest.fn().mockImplementation((data) => {
            // Verificar que la fecha esperada se calculó correctamente
            const fechaEsperada = new Date(data.data.fechaEsperada)
            const ahora = new Date()
            const diferenciaDias = Math.ceil((fechaEsperada.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
            
            // Para item-1, tiempoEntregaDias es 15
            if (data.data.catalogoEquipoId === 'equipo-1') {
              expect(diferenciaDias).toBeCloseTo(15, 1)
            }
            
            return Promise.resolve({ id: 'item-created' })
          })
        }
      }
      return await callback(tx)
    })
    
    ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransaction)
    ;(prisma.pedidoEquipo.findUnique as jest.Mock).mockResolvedValue(mockPedidoCompleto)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  // ✅ Test 10: Validar estructura de respuesta
  it('should return complete order structure', async () => {
    ;(prisma.listaEquipo.findUnique as jest.Mock).mockResolvedValue(mockListaConItems)
    ;(prisma.$transaction as jest.Mock).mockResolvedValue({
      pedido: mockPedidoCreado,
      items: [{ id: 'pedido-item-1' }]
    })
    ;(prisma.pedidoEquipo.findUnique as jest.Mock).mockResolvedValue(mockPedidoCompleto)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('proyecto')
    expect(data).toHaveProperty('responsable')
    expect(data).toHaveProperty('lista')
    expect(data).toHaveProperty('items')
    expect(Array.isArray(data.items)).toBe(true)
  })
})