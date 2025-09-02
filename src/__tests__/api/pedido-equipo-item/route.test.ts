/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/pedido-equipo-item/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

// 🧪 Mocks
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipoItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    listaEquipoItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// ✅ Proper typing for mocked Prisma
const mockPrisma = {
  pedidoEquipoItem: {
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  listaEquipoItem: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any

// Mock the actual prisma import
;(prisma as any) = mockPrisma

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/pedido-equipo-item', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return pedido equipo items successfully', async () => {
      const mockItems = [
        {
          id: '1',
          pedidoId: 'pedido-1',
          listaEquipoItemId: 'lista-item-1',
          cantidadPedida: 5,
          responsableId: 'user-1',
        },
      ]

      mockPrisma.pedidoEquipoItem.findMany.mockResolvedValue(mockItems as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockItems)
      expect(mockPrisma.pedidoEquipoItem.findMany).toHaveBeenCalledWith({
        include: {
          pedido: true,
          listaEquipoItem: true,
          responsable: true,
        },
      })
    })
  })

  describe('POST', () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    }

    const validPayload = {
      pedidoId: 'pedido-1',
      listaEquipoItemId: 'lista-item-1', // ✅ Now required
      cantidadPedida: 3,
      codigo: 'EQ001',
      descripcion: 'Test Equipment',
      unidad: 'pcs',
    }

    it('should create pedido equipo item successfully', async () => {
      const mockListaItem = {
        id: 'lista-item-1',
        cantidad: 10,
        cantidadPedida: 2,
      }

      const mockCreatedItem = {
        id: 'new-item-1',
        ...validPayload,
        responsableId: 'user-123',
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue(mockListaItem as any)
      mockPrisma.pedidoEquipoItem.aggregate.mockResolvedValue({
        _sum: { cantidadPedida: 2 },
      } as any)
      mockPrisma.pedidoEquipoItem.create.mockResolvedValue(mockCreatedItem as any)
      mockPrisma.listaEquipoItem.update.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedItem)
      expect(mockPrisma.pedidoEquipoItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pedidoId: validPayload.pedidoId,
          listaEquipoItemId: validPayload.listaEquipoItemId,
          cantidadPedida: validPayload.cantidadPedida,
          responsableId: 'user-123',
        }),
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should return 400 when lista item is not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ítem de lista no encontrado')
    })

    it('should return 400 when exceeding available quantity', async () => {
      const mockListaItem = {
        id: 'lista-item-1',
        cantidad: 5,
        cantidadPedida: 0,
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.listaEquipoItem.findUnique.mockResolvedValue(mockListaItem as any)
      mockPrisma.pedidoEquipoItem.aggregate.mockResolvedValue({
        _sum: { cantidadPedida: 3 },
      } as any)

      const excessivePayload = {
        ...validPayload,
        cantidadPedida: 5, // 3 + 5 = 8 > 5 available
      }

      const request = new NextRequest('http://localhost/api/pedido-equipo-item', {
        method: 'POST',
        body: JSON.stringify(excessivePayload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('La cantidad total pedida excede la cantidad disponible en la lista')
    })
  })
})