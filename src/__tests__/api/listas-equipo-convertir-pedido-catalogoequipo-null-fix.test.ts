/**
 * Test para verificar el manejo correcto de catalogoEquipo null
 * en convertir-pedido route
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/listas-equipo/convertir-pedido/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth')
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
jest.mock('@/lib/utils/costoCalculations', () => ({
  calcularCostoItem: jest.fn(() => 500) // Mock cost calculation
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as any

describe('API Route: /api/listas-equipo/convertir-pedido - catalogoEquipo null Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', role: 'comercial' }
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle catalogoEquipo as null during validation', async () => {
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: { 
        id: 'proyecto-123',
        codigo: 'PROJ-001',
        nombre: 'Proyecto Test'
      },
      responsable: {
        id: 'user-456',
        name: 'Juan Pérez'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        cantidadPedida: 0,
        unidad: 'pza',
        catalogoEquipo: null, // ✅ catalogoEquipo es null
        cotizacionSeleccionada: {
          id: 'cot-123',
          precioUnitario: 95,
          tiempoEntrega: 15,
          cotizacion: {
            proveedor: {
              id: 'prov-123',
              nombre: 'Proveedor Test'
            }
          }
        }
      }]
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista)
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{ itemId: 'item-123', cantidadAConvertir: 5 }],
        fechaNecesaria: '2024-12-31',
        prioridad: 'media'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('No tiene catálogo de equipo asociado')
  })

  it('should handle catalogoEquipo as valid object', async () => {
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: { 
        id: 'proyecto-123',
        codigo: 'PROJ-001',
        nombre: 'Proyecto Test'
      },
      responsable: {
        id: 'user-456',
        name: 'Juan Pérez'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        cantidadPedida: 0,
        unidad: 'pza',
        catalogoEquipo: {
          id: 'cat-123',
          codigo: 'EQ-001',
          descripcion: 'Equipo de prueba',
          precioVenta: 100
        },
        cotizacionSeleccionada: {
          id: 'cot-123',
          precioUnitario: 95,
          tiempoEntrega: 15,
          cotizacion: {
            proveedor: {
              id: 'prov-123',
              nombre: 'Proveedor Test'
            }
          }
        }
      }]
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista)
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)
    mockPrisma.pedidoEquipo.create.mockResolvedValue({
      id: 'pedido-123',
      codigo: 'PED-PROJ-001-001'
    })

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{ itemId: 'item-123', cantidadAConvertir: 5 }],
        fechaNecesaria: '2024-12-31',
        prioridad: 'media'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verificar que se creó el pedido con los datos correctos
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                codigo: 'EQ-001',
                descripcion: 'Equipo de prueba'
              })
            ])
          }
        })
      })
    )
  })

  it('should use default values when catalogoEquipo properties are missing', async () => {
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: { 
        id: 'proyecto-123',
        codigo: 'PROJ-001',
        nombre: 'Proyecto Test'
      },
      responsable: {
        id: 'user-456',
        name: 'Juan Pérez'
      },
      items: [{
        id: 'item-123',
        cantidad: 10,
        cantidadPedida: 0,
        unidad: 'pza',
        catalogoEquipo: {
          id: 'cat-123',
          codigo: null, // ✅ codigo es null
          descripcion: null, // ✅ descripcion es null
          precioVenta: 100
        },
        cotizacionSeleccionada: {
          id: 'cot-123',
          precioUnitario: 95,
          tiempoEntrega: 15,
          cotizacion: {
            proveedor: {
              id: 'prov-123',
              nombre: 'Proveedor Test'
            }
          }
        }
      }]
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista)
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)
    mockPrisma.pedidoEquipo.create.mockResolvedValue({
      id: 'pedido-123',
      codigo: 'PED-PROJ-001-001'
    })

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [{ itemId: 'item-123', cantidadAConvertir: 5 }],
        fechaNecesaria: '2024-12-31'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verificar que se usaron los valores por defecto
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                codigo: 'SIN-CODIGO', // ✅ Valor por defecto
                descripcion: 'Sin descripción' // ✅ Valor por defecto
              })
            ])
          }
        })
      })
    )
  })

  it('should handle mixed scenarios with some null catalogoEquipo', async () => {
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      proyectoId: 'proyecto-123',
      proyecto: { 
        id: 'proyecto-123',
        codigo: 'PROJ-001',
        nombre: 'Proyecto Test'
      },
      responsable: {
        id: 'user-456',
        name: 'Juan Pérez'
      },
      items: [
        {
          id: 'item-123',
          cantidad: 10,
          cantidadPedida: 0,
          unidad: 'pza',
          catalogoEquipo: null, // ✅ Este es null
          cotizacionSeleccionada: null
        },
        {
          id: 'item-456',
          cantidad: 5,
          cantidadPedida: 0,
          unidad: 'kg',
          catalogoEquipo: {
            id: 'cat-456',
            codigo: 'EQ-002',
            descripcion: 'Equipo válido',
            precioVenta: 200
          },
          cotizacionSeleccionada: {
            id: 'cot-456',
            precioUnitario: 180,
            tiempoEntrega: 10,
            cotizacion: {
              proveedor: {
                id: 'prov-456',
                nombre: 'Proveedor 2'
              }
            }
          }
        }
      ]
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista)
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-123',
        items: [
          { itemId: 'item-123', cantidadAConvertir: 3 }, // Este fallará por catalogoEquipo null
          { itemId: 'item-456', cantidadAConvertir: 2 }  // Este debería ser válido
        ],
        fechaNecesaria: '2024-12-31'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('No tiene catálogo de equipo asociado')
  })

  it('should verify null checking logic', () => {
    // Test unitario para verificar el comportamiento de las verificaciones null
    const testCases = [
      { catalogoEquipo: null, shouldPass: false },
      { catalogoEquipo: undefined, shouldPass: false },
      { catalogoEquipo: { codigo: 'EQ-001', descripcion: 'Test' }, shouldPass: true },
      { catalogoEquipo: { codigo: null, descripcion: null }, shouldPass: true }, // Objeto existe pero propiedades null
    ]

    testCases.forEach(({ catalogoEquipo, shouldPass }) => {
      const hasValidCatalogo = !!catalogoEquipo
      expect(hasValidCatalogo).toBe(shouldPass)
      
      if (hasValidCatalogo) {
        // Test optional chaining behavior
        const codigo = catalogoEquipo?.codigo || 'SIN-CODIGO'
        const descripcion = catalogoEquipo?.descripcion || 'Sin descripción'
        
        expect(typeof codigo).toBe('string')
        expect(typeof descripcion).toBe('string')
      }
    })
  })
})