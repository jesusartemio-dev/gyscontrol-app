/**
 * @fileoverview Test para verificar que el campo numeroSecuencia se incluye correctamente
 * al convertir una lista de equipos a pedido
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
    pedidoEquipo: {
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/listas-equipo/convertir-pedido - numeroSecuencia field', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 🔐 Mock session válida
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        role: 'comercial'
      }
    } as any)
  })

  it('should include numeroSecuencia field when creating pedido', async () => {
    // 📋 Arrange
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: {
        codigo: 'PRJ001'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        unidad: 'UND',
        catalogoEquipo: {
          codigo: 'EQ001',
          descripcion: 'Equipo Test'
        },
        costoElegido: 1000,
        cotizacionSeleccionada: {
          precioUnitario: 100,
          tiempoEntrega: '7 días',
          cotizacion: {
            proveedor: {
              nombre: 'Proveedor Test'
            }
          }
        }
      }]
    }

    const mockUltimoPedido = {
      codigo: 'PED-PRJ001-002'
    }

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-003',
      numeroSecuencia: 3,
      items: []
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(mockUltimoPedido),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        }
      }
      return await callback(mockTx as any)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{
          itemId: 'item-123',
          cantidadAConvertir: 5
        }],
        fechaNecesaria: '2024-12-31',
        prioridad: 'media',
        esUrgente: false,
        observaciones: 'Test conversion'
      })
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(201)
    
    // Verificar que se llamó a create con numeroSecuencia
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    await createCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue(mockLista)
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(mockUltimoPedido),
        create: jest.fn().mockImplementation((data) => {
          // ✅ Verificar que numeroSecuencia está presente
          expect(data.data.numeroSecuencia).toBe(3)
          expect(data.data.codigo).toBe('PED-PRJ001-003')
          return Promise.resolve(mockCreatedPedido)
        })
      }
    } as any)
  })

  it('should use numeroSecuencia 1 when no previous pedidos exist', async () => {
    // 📋 Arrange
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: {
        codigo: 'PRJ001'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        unidad: 'UND',
        catalogoEquipo: {
          codigo: 'EQ001',
          descripcion: 'Equipo Test'
        },
        costoElegido: 500
      }]
    }

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: []
    }

    // 🔧 Setup mocks - no previous pedidos
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null), // No previous pedidos
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        }
      }
      return await callback(mockTx as any)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{
          itemId: 'item-123',
          cantidadAConvertir: 3
        }],
        fechaNecesaria: '2024-12-31'
      })
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(201)
    
    // Verificar que se usó numeroSecuencia 1
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    await createCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue(mockLista)
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((data) => {
          // ✅ Verificar que numeroSecuencia es 1 para el primer pedido
          expect(data.data.numeroSecuencia).toBe(1)
          expect(data.data.codigo).toBe('PED-PRJ001-001')
          return Promise.resolve(mockCreatedPedido)
        })
      }
    } as any)
  })

  it('should increment numeroSecuencia based on last pedido', async () => {
    // 📋 Arrange
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: {
        codigo: 'PRJ001'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        unidad: 'UND',
        catalogoEquipo: {
          codigo: 'EQ001',
          descripcion: 'Equipo Test'
        },
        costoElegido: 750
      }]
    }

    const mockUltimoPedido = {
      codigo: 'PED-PRJ001-015' // Último pedido es el 15
    }

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-016',
      numeroSecuencia: 16,
      items: []
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(mockUltimoPedido),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        }
      }
      return await callback(mockTx as any)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{
          itemId: 'item-123',
          cantidadAConvertir: 8
        }],
        fechaNecesaria: '2024-12-31'
      })
    })

    // 🎯 Act
    const response = await POST(request)

    // ✅ Assert
    expect(response.status).toBe(201)
    
    // Verificar que se incrementó correctamente
    const createCall = mockPrisma.$transaction.mock.calls[0][0]
    await createCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue(mockLista)
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(mockUltimoPedido),
        create: jest.fn().mockImplementation((data) => {
          // ✅ Verificar que numeroSecuencia se incrementó a 16
          expect(data.data.numeroSecuencia).toBe(16)
          expect(data.data.codigo).toBe('PED-PRJ001-016')
          return Promise.resolve(mockCreatedPedido)
        })
      }
    } as any)
  })
})