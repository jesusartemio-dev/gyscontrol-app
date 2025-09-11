// ===================================================
// 📁 Archivo: /src/__tests__/api/lista-equipo/route.test.ts
// 🔧 Descripción: Tests para API de lista-equipo
// 🧠 Uso: Verificar GET y POST de listas de equipos
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

import { GET, POST } from '@/app/api/lista-equipo/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// 🔧 Mocks
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    proyecto: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/lista-equipo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return listas with calculated montoEstimado using correct price fields', async () => {
      // 🎯 Mock data with ListaEquipoItem fields
      const mockData = [
        {
          id: 'lista1',
          nombre: 'Lista Test',
          items: [
            {
              id: 'item1',
              cantidad: 2,
              precioElegido: 100, // ✅ Campo correcto
              presupuesto: 80,    // ✅ Campo correcto
              cotizaciones: [
                { precioUnitario: 90 }
              ],
              pedidos: [
                { cantidadPedida: 1 }
              ]
            },
            {
              id: 'item2', 
              cantidad: 3,
              precioElegido: null,
              presupuesto: 50,
              cotizaciones: [],
              pedidos: []
            }
          ]
        }
      ]

      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockData as any)

      const request = new Request('http://localhost/api/lista-equipo')
      const response = await GET(request)
      const result = await response.json()

      // ✅ Verify calculations use correct fields
      expect(result[0].montoEstimado).toBe(330) // (90 * 2) + (50 * 3)
      expect(result[0].items[0].cantidadPedida).toBe(1)
      expect(result[0].items[1].cantidadPedida).toBe(0)
    })

    it('should filter by proyectoId when provided', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([])

      const request = new Request('http://localhost/api/lista-equipo?proyectoId=proj1')
      await GET(request)

      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { proyectoId: 'proj1' }
        })
      )
    })
  })

  describe('POST', () => {
    it('should create new lista with sequential code', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', role: 'admin' }
      } as any)

      mockPrisma.proyecto.findUnique.mockResolvedValue({
        codigo: 'PRJ001'
      } as any)

      mockPrisma.listaEquipo.findFirst.mockResolvedValue({
        numeroSecuencia: 5
      } as any)

      mockPrisma.listaEquipo.create.mockResolvedValue({
        id: 'new-lista',
        codigo: 'PRJ001-LST-006'
      } as any)

      const request = new Request('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify({
          proyectoId: 'proj1',
          nombre: 'Nueva Lista'
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(mockPrisma.listaEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'PRJ001-LST-006',
            numeroSecuencia: 6
          })
        })
      )
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new Request('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify({
          proyectoId: 'proj1',
          nombre: 'Nueva Lista'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })
})
