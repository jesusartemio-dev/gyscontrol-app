// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Ubicación: src/app/api/pedido-equipo/
// 🔧 Descripción: Tests para la API de pedidos de equipo con filtros de fecha OC
// ✍️ Autor: Jesús Artemio (GYS) + IA GYS
// 📅 Última actualización: 2025-01-01
// ===================================================

import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipo: {
      findMany: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/pedido-equipo GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockPedidos = [
    {
      id: '1',
      codigo: 'PED-001',
      estado: 'enviado',
      fechaPedido: new Date('2024-01-15'),
      responsable: { id: '1', name: 'Juan Pérez' },
      proyecto: { id: '1', nombre: 'Proyecto Test' },
      items: [
        {
          id: '1',
          fechaOrdenCompraRecomendada: new Date('2024-02-01'),
          listaEquipoItem: { proveedor: { nombre: 'Proveedor A' } },
        },
      ],
    },
  ]

  it('handles basic request without filters', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPedidos)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {},
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles fechaOCDesde filter', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?fechaOCDesde=2024-01-01'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {
        items: {
          some: {
            fechaOrdenCompraRecomendada: {
              gte: new Date('2024-01-01'),
            },
          },
        },
      },
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles fechaOCHasta filter', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?fechaOCHasta=2024-12-31'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {
        items: {
          some: {
            fechaOrdenCompraRecomendada: {
              lte: new Date('2024-12-31T23:59:59.999Z'),
            },
          },
        },
      },
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles soloVencidas filter', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?soloVencidas=true'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {
        items: {
          some: {
            fechaOrdenCompraRecomendada: {
              lt: expect.any(Date),
            },
          },
        },
      },
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles combined OC date filters', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?fechaOCDesde=2024-01-01&fechaOCHasta=2024-12-31&soloVencidas=true'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {
        items: {
          some: {
            fechaOrdenCompraRecomendada: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31T23:59:59.999Z'),
              lt: expect.any(Date),
            },
          },
        },
      },
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles combined traditional and OC filters', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?estado=enviado&responsableId=1&fechaOCDesde=2024-01-01'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {
        estado: 'enviado',
        responsableId: '1',
        items: {
          some: {
            fechaOrdenCompraRecomendada: {
              gte: new Date('2024-01-01'),
            },
          },
        },
      },
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles soloVencidas=false correctly', async () => {
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

    const request = new NextRequest(
      'http://localhost:3000/api/pedido-equipo?soloVencidas=false'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith({
      where: {},
      include: expect.any(Object),
      orderBy: { fechaPedido: 'desc' },
    })
  })

  it('handles errors gracefully', async () => {
    mockPrisma.pedidoEquipo.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/pedido-equipo')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Error al obtener pedidos')
  })
})