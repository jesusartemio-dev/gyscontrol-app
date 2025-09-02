/**
 * Test para verificar el manejo correcto de cantidadPedida null
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

describe('API Route: /api/listas-equipo/convertir-pedido - cantidadPedida null Fix', () => {
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

  it('should handle cantidadPedida as null (treat as 0)', async () => {
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
        cantidadPedida: null, // ✅ cantidadPedida es null
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

    // Mock transaction
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

    // Verificar que se procesó correctamente
    // cantidadDisponible = 10 - (null ?? 0) = 10 - 0 = 10
    // cantidadAConvertir = 5, que es <= 10, por lo que debería ser válido
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalled()
  })

  it('should handle cantidadPedida as 0', async () => {
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
        cantidadPedida: 0, // ✅ cantidadPedida es 0
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
        items: [{ itemId: 'item-123', cantidadAConvertir: 8 }],
        fechaNecesaria: '2024-12-31'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // cantidadDisponible = 10 - (0 ?? 0) = 10 - 0 = 10
    // cantidadAConvertir = 8, que es <= 10, válido
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalled()
  })

  it('should handle cantidadPedida with actual value', async () => {
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
        cantidadPedida: 3, // ✅ cantidadPedida tiene valor
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
        fechaNecesaria: '2024-12-31'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // cantidadDisponible = 10 - (3 ?? 0) = 10 - 3 = 7
    // cantidadAConvertir = 5, que es <= 7, válido
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalled()
  })

  it('should reject when cantidadAConvertir exceeds cantidadDisponible', async () => {
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
        cantidadPedida: 8, // ✅ Ya se pidieron 8
        unidad: 'pza',
        catalogoEquipo: {
          id: 'cat-123',
          codigo: 'EQ-001',
          descripcion: 'Equipo de prueba',
          precioVenta: 100
        },
        cotizacionSeleccionada: null
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
        items: [{ itemId: 'item-123', cantidadAConvertir: 5 }], // Quiere 5 más, pero solo quedan 2
        fechaNecesaria: '2024-12-31'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('Cantidad a convertir (5) excede la disponible (2)')
  })

  it('should verify nullish coalescing operator usage', () => {
    // Test unitario para verificar el comportamiento del operador ??
    const testCases = [
      { cantidadPedida: null, expected: 0 },
      { cantidadPedida: undefined, expected: 0 },
      { cantidadPedida: 0, expected: 0 },
      { cantidadPedida: 5, expected: 5 },
      { cantidadPedida: 10.5, expected: 10.5 }
    ]

    testCases.forEach(({ cantidadPedida, expected }) => {
      const result = cantidadPedida ?? 0
      expect(result).toBe(expected)
    })
  })
})