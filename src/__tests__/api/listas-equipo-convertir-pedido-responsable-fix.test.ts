/**
 * @fileoverview Test para verificar que el campo 'responsableId' se incluye correctamente
 * en los items del pedido al convertir una lista de equipos
 * @version 1.0.0
 * @since 2024
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/listas-equipo/convertir-pedido/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// 🧪 Mocks
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    listaEquipo: {
      findUnique: jest.fn()
    },
    listaEquipoItem: {
      findMany: jest.fn()
    },
    pedidoEquipo: {
      count: jest.fn(),
      create: jest.fn()
    }
  }
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/listas-equipo/convertir-pedido - ResponsableId Fix', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      role: 'proyectos'
    }
  }

  const mockLista = {
    id: 'lista-123',
    codigo: 'LST-001',
    proyectoId: 'proyecto-123',
    estado: 'aprobado'
  }

  const mockListaItem = {
    id: 'item-123',
    codigo: 'EQ-001',
    descripcion: 'Equipo Test',
    unidad: 'und',
    cantidad: 5,
    cantidadPedida: 0,
    costoElegido: 1000,
    cotizacionSeleccionada: {
      precioUnitario: 200,
      tiempoEntrega: '7 días',
      cotizacion: {
        proveedor: {
          nombre: 'Proveedor Test'
        }
      }
    },
    catalogoEquipo: {
      codigo: 'CAT-001',
      descripcion: 'Catálogo Test'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  it('debe incluir responsableId en los items del pedido', async () => {
    // 📋 Arrange
    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 3 }],
      fechaNecesaria: '2024-12-31',
      prioridad: 'media' as const,
      observaciones: 'Test conversion'
    }

    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest

    // Mock transaction
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue([mockListaItem])
        },
        pedidoEquipo: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({
            id: 'pedido-123',
            codigo: 'PED-001',
            items: [{
              id: 'pedido-item-123',
              responsableId: 'user-123',
              codigo: 'CAT-001',
              descripcion: 'Catálogo Test'
            }]
          })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    
    // Verificar que se llamó create con responsableId
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    const mockTx = {
      listaEquipo: { findUnique: jest.fn().mockResolvedValue(mockLista) },
      listaEquipoItem: { findMany: jest.fn().mockResolvedValue([mockListaItem]) },
      pedidoEquipo: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn()
      }
    }
    
    await createCall(mockTx as any)
    
    const createCallArgs = mockTx.pedidoEquipo.create.mock.calls[0][0]
    expect(createCallArgs.data.items.create).toBeDefined()
    expect(createCallArgs.data.items.create[0]).toMatchObject({
      responsableId: 'user-123',
      listaId: 'lista-123',
      listaEquipoItemId: 'item-123',
      codigo: 'CAT-001',
      descripcion: 'Catálogo Test',
      cantidadPedida: 3,
      estado: 'pendiente'
    })
  })

  it('debe usar el responsableId de la sesión actual', async () => {
    // 📋 Arrange - Sesión con diferente usuario
    const differentSession = {
      user: {
        id: 'user-456',
        role: 'proyectos'
      }
    }
    mockGetServerSession.mockResolvedValue(differentSession as any)

    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 2 }],
      fechaNecesaria: '2024-12-31'
    }

    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest

    // Mock transaction
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue([mockListaItem])
        },
        pedidoEquipo: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'pedido-123' })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(200)
    
    // Verificar que se usó el ID del usuario de la sesión
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    const mockTx = {
      listaEquipo: { findUnique: jest.fn().mockResolvedValue(mockLista) },
      listaEquipoItem: { findMany: jest.fn().mockResolvedValue([mockListaItem]) },
      pedidoEquipo: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn()
      }
    }
    
    await createCall(mockTx as any)
    
    const createCallArgs = mockTx.pedidoEquipo.create.mock.calls[0][0]
    expect(createCallArgs.data.items.create[0].responsableId).toBe('user-456')
  })

  it('debe manejar múltiples items con el mismo responsableId', async () => {
    // 📋 Arrange
    const multipleItems = [
      { ...mockListaItem, id: 'item-1' },
      { ...mockListaItem, id: 'item-2' },
      { ...mockListaItem, id: 'item-3' }
    ]

    const requestBody = {
      listaId: 'lista-123',
      items: [
        { itemId: 'item-1', cantidadAConvertir: 1 },
        { itemId: 'item-2', cantidadAConvertir: 2 },
        { itemId: 'item-3', cantidadAConvertir: 3 }
      ],
      fechaNecesaria: '2024-12-31'
    }

    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest

    // Mock transaction
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue(multipleItems)
        },
        pedidoEquipo: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'pedido-123' })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(200)
    
    // Verificar que todos los items tienen el mismo responsableId
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    const mockTx = {
      listaEquipo: { findUnique: jest.fn().mockResolvedValue(mockLista) },
      listaEquipoItem: { findMany: jest.fn().mockResolvedValue(multipleItems) },
      pedidoEquipo: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn()
      }
    }
    
    await createCall(mockTx as any)
    
    const createCallArgs = mockTx.pedidoEquipo.create.mock.calls[0][0]
    const createdItems = createCallArgs.data.items.create
    
    expect(createdItems).toHaveLength(3)
    createdItems.forEach((item: any) => {
      expect(item.responsableId).toBe('user-123')
    })
  })
})
