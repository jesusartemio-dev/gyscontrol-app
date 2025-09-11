/**
 * @fileoverview Test para verificar que el campo 'observacion' se usa correctamente
 * en lugar de 'observaciones' al convertir una lista de equipos a pedido
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

describe('/api/listas-equipo/convertir-pedido - Observacion Fix', () => {
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

  it('debe usar el campo observacion (singular) en lugar de observaciones', async () => {
    // 📋 Arrange
    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 3 }],
      fechaNecesaria: '2024-12-31',
      observaciones: 'Observación personalizada del usuario'
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
            observacion: 'Observación personalizada del usuario'
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
    
    // Verificar que se llamó create con 'observacion' (singular)
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
    expect(createCallArgs.data).toHaveProperty('observacion')
    expect(createCallArgs.data).not.toHaveProperty('observaciones')
    expect(createCallArgs.data.observacion).toBe('Observación personalizada del usuario')
  })

  it('debe usar observacion por defecto cuando no se proporciona', async () => {
    // 📋 Arrange - Sin observaciones en el request
    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 2 }],
      fechaNecesaria: '2024-12-31'
      // Sin observaciones
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
            observacion: 'Convertido desde lista LST-001'
          })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(200)
    
    // Verificar que se usó la observación por defecto
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
    expect(createCallArgs.data.observacion).toBe('Convertido desde lista LST-001')
  })

  it('debe manejar observaciones vacías correctamente', async () => {
    // 📋 Arrange - Observaciones vacías
    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 1 }],
      fechaNecesaria: '2024-12-31',
      observaciones: '' // String vacío
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
            observacion: 'Convertido desde lista LST-001'
          })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(200)
    
    // Verificar que se usó la observación por defecto cuando está vacía
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
    expect(createCallArgs.data.observacion).toBe('Convertido desde lista LST-001')
  })

  it('debe preservar observaciones largas correctamente', async () => {
    // 📋 Arrange - Observación larga
    const observacionLarga = 'Esta es una observación muy larga que contiene múltiples detalles sobre el pedido, incluyendo especificaciones técnicas, fechas importantes, y consideraciones especiales para el proyecto.'
    
    const requestBody = {
      listaId: 'lista-123',
      items: [{ itemId: 'item-123', cantidadAConvertir: 4 }],
      fechaNecesaria: '2024-12-31',
      observaciones: observacionLarga
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
            observacion: observacionLarga
          })
        }
      }
      return callback(mockTx as any)
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(200)
    
    // Verificar que se preservó la observación larga
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
    expect(createCallArgs.data.observacion).toBe(observacionLarga)
  })
})
