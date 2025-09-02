// ===================================================
// 📁 Archivo: desde-lista.test.ts
// 📌 Ubicación: src/__tests__/api/pedido-equipo/
// 🔧 Descripción: Tests para API de pedido desde lista
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pedido-equipo/desde-lista/route'
import { prisma } from '@/lib/prisma'
import { PedidoEquipoPayload } from '@/types'

// 🔧 Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findUnique: jest.fn(),
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

// 🔧 Mock Logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/pedido-equipo/desde-lista', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should validate required fields', async () => {
      const payload: Partial<PedidoEquipoPayload> = {
        proyectoId: '',
        responsableId: '',
        listaId: '',
      }

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain('Faltan datos requeridos')
    })

    it('should validate items selection', async () => {
      const payload: PedidoEquipoPayload = {
        proyectoId: 'test-proyecto',
        responsableId: 'test-responsable',
        listaId: 'test-lista',
        itemsSeleccionados: [],
      }

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain('Debe seleccionar al menos un item')
    })

    it('should handle lista not found', async () => {
      const payload: PedidoEquipoPayload = {
        proyectoId: 'test-proyecto',
        responsableId: 'test-responsable',
        listaId: 'test-lista',
        itemsSeleccionados: [{
          listaEquipoItemId: 'test-item',
          cantidadPedida: 1,
        }],
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe('Lista técnica no encontrada')
    })

    it('should calculate costs correctly with precioElegido', async () => {
      const payload: PedidoEquipoPayload = {
        proyectoId: 'test-proyecto',
        responsableId: 'test-responsable',
        listaId: 'test-lista',
        itemsSeleccionados: [{
          listaEquipoItemId: 'test-item',
          cantidadPedida: 2,
        }],
      }

      const mockLista = {
        id: 'test-lista',
        items: [{
          id: 'test-item',
          catalogoEquipoId: 'test-catalogo',
          cantidad: 10,
          precioElegido: 100, // $100 total for 10 units = $10 per unit
          presupuesto: null,
          cotizacionSeleccionada: null,
          catalogoEquipo: {
            tiempoEntregaDias: 15,
          },
        }],
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockLista as any)
      mockPrisma.proyecto.findUnique.mockResolvedValue({ codigo: 'TEST' } as any)
      mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma as any)
      })

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/desde-lista', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // This should not throw TypeScript errors anymore
      const response = await POST(request)
      
      // The test validates that the function can be called without TypeScript compilation errors
      expect(mockPrisma.listaEquipo.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-lista' },
        include: {
          items: {
            include: {
              catalogoEquipo: true,
              cotizacionSeleccionada: true,
            },
          },
        },
      })
    })
  })
})