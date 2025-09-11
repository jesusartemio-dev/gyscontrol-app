/**
 * @fileoverview Test para verificar que el campo 'name' se usa correctamente
 * en el select del responsable al convertir una lista de equipos a pedido
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

describe('/api/listas-equipo/convertir-pedido - User name field', () => {
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

  it('should use name field instead of nombre in responsable select', async () => {
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
        name: 'Juan Pérez' // ✅ Campo 'name' del modelo User
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((options) => {
            // ✅ Verificar que el include usa 'name' no 'nombre'
            expect(options.include.responsable.select.name).toBe(true)
            expect(options.include.responsable.select.nombre).toBeUndefined()
            return Promise.resolve(mockCreatedPedido)
          })
        },
        listaEquipoItem: {
          update: jest.fn().mockResolvedValue({})
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
    expect(result.pedido.responsable.name).toBe('Juan Pérez')
    expect(result.pedido.responsable.nombre).toBeUndefined() // No debe existir 'nombre'
  })

  it('should handle responsable with null name', async () => {
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
        cantidad: 5,
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
        name: null // ✅ Campo 'name' puede ser null según schema
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCreatedPedido)
        },
        listaEquipoItem: {
          update: jest.fn().mockResolvedValue({})
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
    expect(result.pedido.responsable.name).toBeNull()
    expect(result.pedido.responsable.id).toBe('user-123')
  })

  it('should include correct fields in all select objects', async () => {
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
        cantidad: 8,
        unidad: 'UND',
        catalogoEquipo: {
          codigo: 'EQ001',
          descripcion: 'Equipo Test'
        },
        costoElegido: 800
      }]
    }

    const mockCreatedPedido = {
      id: 'pedido-123',
      codigo: 'PED-PRJ001-001',
      numeroSecuencia: 1,
      items: [],
      proyecto: {
        id: 'proyecto-123',
        codigo: 'PRJ001',
        nombre: 'Proyecto Test' // ✅ 'nombre' correcto para Proyecto
      },
      lista: {
        id: 'lista-123',
        codigo: 'LST-001',
        nombre: 'Lista Test' // ✅ 'nombre' correcto para ListaEquipo
      },
      responsable: {
        id: 'user-123',
        name: 'María García' // ✅ 'name' correcto para User
      }
    }

    // 🔧 Setup mocks
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue(mockLista)
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((options) => {
            // ✅ Verificar estructura completa del include
            expect(options.include.proyecto.select.nombre).toBe(true)
            expect(options.include.lista.select.nombre).toBe(true)
            expect(options.include.responsable.select.name).toBe(true)
            expect(options.include.responsable.select.nombre).toBeUndefined()
            return Promise.resolve(mockCreatedPedido)
          })
        },
        listaEquipoItem: {
          update: jest.fn().mockResolvedValue({})
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
          cantidadAConvertir: 6
        }],
        fechaNecesaria: '2024-12-31'
      })
    })

    // 🎯 Act
    const response = await POST(request)
    const result = await response.json()

    // ✅ Assert
    expect(response.status).toBe(201)
    expect(result.pedido.proyecto.nombre).toBe('Proyecto Test')
    expect(result.pedido.lista.nombre).toBe('Lista Test')
    expect(result.pedido.responsable.name).toBe('María García')
  })
})
