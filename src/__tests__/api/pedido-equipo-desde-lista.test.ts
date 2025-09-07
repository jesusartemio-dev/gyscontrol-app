// ===================================================
// 📁 Archivo: pedido-equipo-desde-lista.test.ts
// 📌 Ubicación: src/__tests__/api/
// 🔧 Descripción: Tests para el endpoint de creación de pedidos desde lista contextual
// 🧠 Uso: Verificar que se genera correctamente el código del pedido
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pedido-equipo/desde-lista/route'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findUnique: jest.fn(),
    },
    listaEquipoItem: {
      findMany: jest.fn(),
    },
    proyecto: {
      findUnique: jest.fn(),
    },
    pedidoEquipo: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/pedido-equipo/desde-lista', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - Crear pedido desde lista', () => {
    const validPayload = {
      proyectoId: 'proyecto-123',
      responsableId: 'user-123',
      listaId: 'lista-123',
      fechaNecesaria: '2025-01-20T00:00:00.000Z',
      prioridad: 'alta',
      esUrgente: true,
      itemsSeleccionados: [
        {
          listaEquipoItemId: 'item-123',
          cantidadPedida: 2
        }
      ]
    }

    it('should generate correct sequential code pattern', async () => {
      // Mock data
      const mockProyecto = {
        id: 'proyecto-123',
        codigo: 'STK01'
      }

      const mockLista = {
        id: 'lista-123',
        items: [
          {
            id: 'item-123',
            codigo: 'EQ001',
            descripcion: 'Equipo Test',
            unidad: 'UND',
            cantidad: 5,
            precioElegido: 100,
            tiempoEntrega: '7 días',
            tiempoEntregaDias: 7,
            catalogoEquipo: {
              tiempoEntregaDias: 7
            }
          }
        ]
      }

      const mockUltimoPedido = {
        numeroSecuencia: 515
      }

      const mockNuevoPedido = {
        id: 'pedido-123',
        codigo: 'STK01-PED-516',
        numeroSecuencia: 516
      }

      // Setup mocks
      mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista as any)
      mockPrisma.listaEquipoItem.findMany.mockResolvedValue([mockLista.items[0]] as any)
      mockPrisma.proyecto.findUnique.mockResolvedValue(mockProyecto as any)
      mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(mockUltimoPedido as any)
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          pedidoEquipo: {
            create: jest.fn().mockResolvedValue(mockNuevoPedido)
          },
          pedidoEquipoItem: {
            create: jest.fn().mockResolvedValue({
              id: 'item-pedido-123',
              pedidoId: 'pedido-123'
            })
          },
          pedidoEquipo: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockNuevoPedido,
              items: [{ id: 'item-pedido-123' }]
            })
          }
        }
        return await callback(mockTx as any)
      })

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      // Verificaciones
      expect(response.status).toBe(201)
      expect(result.codigo).toBe('STK01-PED-516')
      expect(result.numeroSecuencia).toBe(516)
      
      // Verificar que se consultó el último pedido del proyecto
      expect(mockPrisma.pedidoEquipo.findFirst).toHaveBeenCalledWith({
        where: { proyectoId: 'proyecto-123' },
        orderBy: { numeroSecuencia: 'desc' }
      })
    })

    it('should generate first code when no previous orders exist', async () => {
      const mockProyecto = {
        id: 'proyecto-123',
        codigo: 'NEW01'
      }

      const mockLista = {
        id: 'lista-123',
        items: [
          {
            id: 'item-123',
            codigo: 'EQ001',
            descripcion: 'Equipo Test',
            unidad: 'UND',
            cantidad: 5,
            precioElegido: 100,
            tiempoEntrega: '7 días',
            tiempoEntregaDias: 7,
            catalogoEquipo: {
              tiempoEntregaDias: 7
            }
          }
        ]
      }

      const mockNuevoPedido = {
        id: 'pedido-123',
        codigo: 'NEW01-PED-001',
        numeroSecuencia: 1
      }

      // Setup mocks - no previous orders
      mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista as any)
      mockPrisma.listaEquipoItem.findMany.mockResolvedValue([mockLista.items[0]] as any)
      mockPrisma.proyecto.findUnique.mockResolvedValue(mockProyecto as any)
      mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null) // No previous orders
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          pedidoEquipo: {
            create: jest.fn().mockResolvedValue(mockNuevoPedido)
          },
          pedidoEquipoItem: {
            create: jest.fn().mockResolvedValue({
              id: 'item-pedido-123',
              pedidoId: 'pedido-123'
            })
          },
          pedidoEquipo: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockNuevoPedido,
              items: [{ id: 'item-pedido-123' }]
            })
          }
        }
        return await callback(mockTx as any)
      })

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      // Verificaciones
      expect(response.status).toBe(201)
      expect(result.codigo).toBe('NEW01-PED-001')
      expect(result.numeroSecuencia).toBe(1)
    })

    it('should return 404 when project does not exist', async () => {
      // Setup mocks
      mockPrisma.listaEquipo.findUnique.mockResolvedValue({ items: [] } as any)
      mockPrisma.listaEquipoItem.findMany.mockResolvedValue([])
      mockPrisma.proyecto.findUnique.mockResolvedValue(null) // Project not found

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Proyecto no encontrado')
    })

    it('should validate required fields', async () => {
      const invalidPayload = {
        // Missing required fields
        itemsSeleccionados: []
      }

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('requeridos')
    })
  })
})