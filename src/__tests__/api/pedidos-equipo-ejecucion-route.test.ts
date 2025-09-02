/**
 * 🧪 Tests for Pedidos Equipo Ejecución API Route
 * Tests the execution phase API endpoints for equipment orders
 * Validates GET and PUT operations with proper field mapping
 */

import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/pedidos-equipo/ejecucion/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// ✅ Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipo: {
      findMany: jest.fn(),
      update: jest.fn()
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

describe('/api/pedidos-equipo/ejecucion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      // 🔐 Setup: No session
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should return pedidos with correct field mapping', async () => {
      // 🔐 Setup: Valid session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      // 📊 Mock data with correct field names
      const mockPedidos = [
        {
          id: 'pedido1',
          codigo: 'PED-001',
          estado: 'enviado',
          prioridad: 'alta',
          esUrgente: true,
          fechaPedido: new Date('2024-01-01'),
          fechaNecesaria: new Date('2024-01-15'),
          fechaEntregaEstimada: new Date('2024-01-10'),
          fechaEntregaReal: null,
          presupuestoTotal: 1000,
          costoRealTotal: 950,
          proyecto: {
            id: 'proj1',
            nombre: 'Proyecto Test',
            codigo: 'PROJ-001'
          },
          lista: {
            id: 'lista1',
            codigo: 'LIST-001',
            nombre: 'Lista Test'
          },
          responsable: {
            id: 'user1',
            name: 'Juan Pérez' // ✅ Correct field name
          },
          items: [
            {
              id: 'item1',
              codigo: 'ITEM-001',
              descripcion: 'Item Test',
              unidad: 'und',
              cantidadPedida: 5,
              cantidadAtendida: 3,
              precioUnitario: 100,
              costoTotal: 500,
              estado: 'parcial',
              tiempoEntrega: 7,
              proveedorSeleccionado: 'Proveedor A' // ✅ Correct field name
            }
          ]
        }
      ]

      mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pedidos).toHaveLength(1)
      expect(data.pedidos[0].responsable.name).toBe('Juan Pérez')
      expect(data.pedidos[0].items[0].proveedorSeleccionado).toBe('Proveedor A')
      expect(data.metricas).toBeDefined()
      expect(data.metricas.totalPedidos).toBe(1)
    })

    it('should apply filters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      mockPrisma.pedidoEquipo.findMany.mockResolvedValue([])

      const url = 'http://localhost:3000/api/pedidos-equipo/ejecucion?proyectoId=proj1&estado=enviado&prioridad=alta&esUrgente=true'
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            proyectoId: 'proj1',
            estado: 'enviado',
            prioridad: 'alta',
            esUrgente: true
          }
        })
      )
    })

    it('should calculate metrics correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      const mockPedidos = [
        {
          id: 'pedido1',
          codigo: 'PED-001',
          estado: 'entregado',
          costoRealTotal: 1000,
          fechaPedido: new Date('2024-01-01'),
          fechaEntregaReal: new Date('2024-01-08'), // 7 days
          items: [{ cantidadPedida: 5, cantidadAtendida: 5 }],
          proyecto: { id: 'proj1', nombre: 'Test', codigo: 'TEST' },
          lista: null,
          responsable: { id: 'user1', name: 'Test User' },
          prioridad: 'media',
          esUrgente: false,
          fechaNecesaria: new Date('2024-01-10'),
          fechaEntregaEstimada: null,
          presupuestoTotal: 1000
        },
        {
          id: 'pedido2',
          codigo: 'PED-002',
          estado: 'enviado',
          costoRealTotal: 500,
          fechaPedido: new Date('2024-01-01'),
          fechaEntregaReal: null,
          items: [{ cantidadPedida: 3, cantidadAtendida: 1 }],
          proyecto: { id: 'proj1', nombre: 'Test', codigo: 'TEST' },
          lista: null,
          responsable: { id: 'user1', name: 'Test User' },
          prioridad: 'alta',
          esUrgente: true,
          fechaNecesaria: new Date('2024-01-05'),
          fechaEntregaEstimada: null,
          presupuestoTotal: 500
        }
      ]

      mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidos as any)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion')
      const response = await GET(request)
      const data = await response.json()

      expect(data.metricas.totalPedidos).toBe(2)
      expect(data.metricas.costoReal).toBe(1500)
      expect(data.metricas.pedidosPendientes).toBe(1) // Only 'enviado' status
      expect(data.metricas.tiempoPromedioEntrega).toBe(7) // Only delivered orders
    })
  })

  describe('PUT', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion', {
        method: 'PUT',
        body: JSON.stringify({ pedidoId: 'pedido1', estado: 'entregado' })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should return 400 when required fields are missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion', {
        method: 'PUT',
        body: JSON.stringify({ pedidoId: 'pedido1' }) // Missing estado
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Faltan campos requeridos')
    })

    it('should update pedido successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      const mockUpdatedPedido = {
        id: 'pedido1',
        codigo: 'PED-001',
        estado: 'entregado',
        fechaEntregaReal: new Date('2024-01-10'),
        proyecto: { id: 'proj1', nombre: 'Test', codigo: 'TEST' },
        lista: null,
        responsable: { id: 'user1', name: 'Test User' },
        items: []
      }

      mockPrisma.pedidoEquipo.update.mockResolvedValue(mockUpdatedPedido as any)

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion', {
        method: 'PUT',
        body: JSON.stringify({
          pedidoId: 'pedido1',
          estado: 'entregado',
          fechaEntregaReal: '2024-01-10T00:00:00.000Z',
          observaciones: 'Entregado completo'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Pedido actualizado exitosamente')
      expect(data.pedido.estado).toBe('entregado')
      expect(mockPrisma.pedidoEquipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pedido1' },
          data: expect.objectContaining({
            estado: 'entregado',
            fechaEntregaReal: expect.any(Date),
            observaciones: 'Entregado completo'
          })
        })
      )
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' }
      } as any)

      mockPrisma.pedidoEquipo.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/pedidos-equipo/ejecucion', {
        method: 'PUT',
        body: JSON.stringify({
          pedidoId: 'pedido1',
          estado: 'entregado'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })
})