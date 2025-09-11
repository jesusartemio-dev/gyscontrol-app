/**
 * @fileoverview Test para verificar el manejo correcto de cantidadPedida null
 * al determinar items pendientes en convertir-pedido route
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

describe('/api/listas-equipo/convertir-pedido - cantidadPedida null handling', () => {
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

  it('should handle cantidadPedida null as 0 when filtering pending items', async () => {
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
        costoElegido: 1000
      }]
    }

    const mockTodosLosItems = [
      {
        id: 'item-1',
        cantidad: 10,
        cantidadPedida: null // ✅ Caso null
      },
      {
        id: 'item-2',
        cantidad: 5,
        cantidadPedida: 0 // ✅ Caso 0 explícito
      },
      {
        id: 'item-3',
        cantidad: 8,
        cantidadPedida: 3 // ✅ Caso con valor
      },
      {
        id: 'item-4',
        cantidad: 6,
        cantidadPedida: 6 // ✅ Caso completamente pedido
      }
    ]

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: [],
      proyecto: {
        id: 'proyecto-123',
        codigo: 'PRJ001',
        nombre: 'Proyecto Test'
      },
      lista: {
        id: 'lista-123',
        codigo: 'LST-001',
        nombre: 'Lista Test'
      },
      responsable: {
        id: 'user-123',
        name: 'Juan Pérez'
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista),
          update: jest.fn().mockImplementation((options) => {
            // ✅ Verificar que el estado se calcula correctamente
            // Con cantidadPedida null tratada como 0, todos los items están pendientes
            // excepto item-4 que tiene cantidadPedida = cantidad
            expect(options.data.estado).toBe('parcial') // 3 de 4 items pendientes
            return Promise.resolve({})
          })
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue(mockTodosLosItems),
          update: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
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
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(201)
    expect(result.pedido).toBeDefined()
    
    // Verificar que se llamó findMany para obtener todos los items
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('should set estado to convertida when all items are fully ordered', async () => {
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
        costoElegido: 1000
      }]
    }

    const mockTodosLosItems = [
      {
        id: 'item-1',
        cantidad: 10,
        cantidadPedida: 10 // ✅ Completamente pedido
      },
      {
        id: 'item-2',
        cantidad: 5,
        cantidadPedida: 5 // ✅ Completamente pedido
      }
    ]

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: [],
      proyecto: {
        id: 'proyecto-123',
        codigo: 'PRJ001',
        nombre: 'Proyecto Test'
      },
      lista: {
        id: 'lista-123',
        codigo: 'LST-001',
        nombre: 'Lista Test'
      },
      responsable: {
        id: 'user-123',
        name: 'Juan Pérez'
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista),
          update: jest.fn().mockImplementation((options) => {
            // ✅ Verificar que el estado se establece como 'convertida'
            expect(options.data.estado).toBe('convertida')
            return Promise.resolve({})
          })
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue(mockTodosLosItems),
          update: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
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
        fechaNecesaria: '2024-12-31'
      })
    })

    // 🎯 Act
    const response = await POST(request)
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(201)
    expect(result.pedido).toBeDefined()
  })

  it('should handle mixed null and numeric cantidadPedida values', async () => {
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
        costoElegido: 1000
      }]
    }

    const mockTodosLosItems = [
      {
        id: 'item-1',
        cantidad: 10,
        cantidadPedida: null // ✅ null -> tratado como 0
      },
      {
        id: 'item-2',
        cantidad: 5,
        cantidadPedida: 2 // ✅ parcialmente pedido
      },
      {
        id: 'item-3',
        cantidad: 8,
        cantidadPedida: 8 // ✅ completamente pedido
      }
    ]

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: [],
      proyecto: {
        id: 'proyecto-123',
        codigo: 'PRJ001',
        nombre: 'Proyecto Test'
      },
      lista: {
        id: 'lista-123',
        codigo: 'LST-001',
        nombre: 'Lista Test'
      },
      responsable: {
        id: 'user-123',
        name: 'Juan Pérez'
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista),
          update: jest.fn().mockImplementation((options) => {
            // ✅ Verificar que el estado es 'parcial' (2 de 3 items pendientes)
            expect(options.data.estado).toBe('parcial')
            return Promise.resolve({})
          })
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue(mockTodosLosItems),
          update: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
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
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(201)
    expect(result.pedido).toBeDefined()
  })

  it('should handle edge case where all cantidadPedida are null', async () => {
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
        costoElegido: 1000
      }]
    }

    const mockTodosLosItems = [
      {
        id: 'item-1',
        cantidad: 10,
        cantidadPedida: null // ✅ null -> tratado como 0
      },
      {
        id: 'item-2',
        cantidad: 5,
        cantidadPedida: null // ✅ null -> tratado como 0
      },
      {
        id: 'item-3',
        cantidad: 8,
        cantidadPedida: null // ✅ null -> tratado como 0
      }
    ]

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: [],
      proyecto: {
        id: 'proyecto-123',
        codigo: 'PRJ001',
        nombre: 'Proyecto Test'
      },
      lista: {
        id: 'lista-123',
        codigo: 'LST-001',
        nombre: 'Lista Test'
      },
      responsable: {
        id: 'user-123',
        name: 'Juan Pérez'
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista),
          update: jest.fn().mockImplementation((options) => {
            // ✅ Verificar que el estado es 'parcial' (todos los items pendientes)
            expect(options.data.estado).toBe('parcial')
            return Promise.resolve({})
          })
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue(mockTodosLosItems),
          update: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
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
          cantidadAConvertir: 2
        }],
        fechaNecesaria: '2024-12-31'
      })
    })

    // 🎯 Act
    const response = await POST(request)
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(201)
    expect(result.pedido).toBeDefined()
  })
})
