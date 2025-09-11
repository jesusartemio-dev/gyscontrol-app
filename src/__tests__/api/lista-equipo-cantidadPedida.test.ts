// ===================================================
// 📁 Test: lista-equipo-cantidadPedida.test.ts
// 🔧 Descripción: Test para verificar el cálculo correcto de cantidadPedida
// 🧠 Uso: Verificar que el API calcula correctamente las cantidades pedidas
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Fecha: 2025-01-25
// ===================================================

import { GET } from '@/app/api/lista-equipo/[id]/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/lista-equipo/[id] - cantidadPedida calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate cantidadPedida correctly for items with multiple orders', async () => {
    // 🔧 Mock data with multiple pedidos for same item
    const mockListaEquipo = {
      id: 'lista-1',
      nombre: 'Lista Test',
      items: [
        {
          id: 'item-1',
          codigo: 'TEST-001',
          descripcion: 'Test Item',
          cantidad: 10,
          pedidos: [
            { cantidadPedida: 3 }, // First order
            { cantidadPedida: 2 }, // Second order
            { cantidadPedida: 1 }, // Third order
          ],
          proveedor: null,
          cotizaciones: [],
          proyectoEquipoItem: null,
        },
        {
          id: 'item-2',
          codigo: 'TEST-002',
          descripcion: 'Test Item 2',
          cantidad: 5,
          pedidos: [], // No orders yet
          proveedor: null,
          cotizaciones: [],
          proyectoEquipoItem: null,
        },
      ],
      proyecto: { id: 'proj-1', nombre: 'Test Project' },
      responsable: { id: 'user-1', name: 'Test User' },
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockListaEquipo as any)

    // 📡 Create request
    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1')
    const response = await GET(request, { params: { id: 'lista-1' } })
    const data = await response.json()

    // ✅ Verify cantidadPedida calculation
    expect(data.items[0].cantidadPedida).toBe(6) // 3 + 2 + 1 = 6
    expect(data.items[1].cantidadPedida).toBe(0) // No orders = 0

    // ✅ Verify original data is preserved
    expect(data.items[0].cantidad).toBe(10)
    expect(data.items[1].cantidad).toBe(5)
  })

  it('should handle items with no pedidos', async () => {
    const mockListaEquipo = {
      id: 'lista-2',
      nombre: 'Lista Test 2',
      items: [
        {
          id: 'item-3',
          codigo: 'TEST-003',
          descripcion: 'Test Item 3',
          cantidad: 8,
          pedidos: [], // Empty array
          proveedor: null,
          cotizaciones: [],
          proyectoEquipoItem: null,
        },
      ],
      proyecto: { id: 'proj-2', nombre: 'Test Project 2' },
      responsable: { id: 'user-2', name: 'Test User 2' },
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockListaEquipo as any)

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-2')
    const response = await GET(request, { params: { id: 'lista-2' } })
    const data = await response.json()

    // ✅ Should be 0 when no pedidos
    expect(data.items[0].cantidadPedida).toBe(0)
  })

  it('should handle null/undefined cantidadPedida values', async () => {
    const mockListaEquipo = {
      id: 'lista-3',
      nombre: 'Lista Test 3',
      items: [
        {
          id: 'item-4',
          codigo: 'TEST-004',
          descripcion: 'Test Item 4',
          cantidad: 12,
          pedidos: [
            { cantidadPedida: 5 },
            { cantidadPedida: null }, // null value
            { cantidadPedida: undefined }, // undefined value
            { cantidadPedida: 3 },
          ],
          proveedor: null,
          cotizaciones: [],
          proyectoEquipoItem: null,
        },
      ],
      proyecto: { id: 'proj-3', nombre: 'Test Project 3' },
      responsable: { id: 'user-3', name: 'Test User 3' },
    }

    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockListaEquipo as any)

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-3')
    const response = await GET(request, { params: { id: 'lista-3' } })
    const data = await response.json()

    // ✅ Should handle null/undefined as 0: 5 + 0 + 0 + 3 = 8
    expect(data.items[0].cantidadPedida).toBe(8)
  })
})
