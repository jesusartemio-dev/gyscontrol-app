// ===================================================
// 📁 Archivo: proyectos.test.ts
// 📌 Ubicación: src/__tests__/api/finanzas/aprovisionamiento/
// 🔧 Descripción: Tests para API de aprovisionamiento de proyectos
//
// 🧠 Funcionalidades testeadas:
// - Cálculo correcto de presupuestoTotal usando costoElegido
// - Cálculo correcto de presupuestoEjecutado usando costoReal
// - Filtros y paginación
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { GET } from '@/app/api/finanzas/aprovisionamiento/proyectos/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// 🎭 Mocks
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      count: jest.fn(),
      findMany: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/finanzas/aprovisionamiento/proyectos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // ✅ Mock de sesión válida
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      expires: '2025-12-31'
    })
  })

  describe('GET', () => {
    it('should calculate presupuestoTotal correctly using costoElegido', async () => {
      // 📋 Arrange
      const mockProyectos = [
        {
          id: 'proyecto-1',
          nombre: 'Proyecto Test',
          codigo: 'PRY-001',
          estado: 'activo',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-12-31'),
          updatedAt: new Date(),
          comercial: { name: 'Comercial Test', email: 'comercial@test.com' },
          gestor: { name: 'Gestor Test', email: 'gestor@test.com' },
          cotizacion: {
            cliente: { nombre: 'Cliente Test', ruc: '12345678901' }
          },
          listaEquipos: [
            {
              id: 'lista-1',
              estado: 'aprobado',
              items: [
                {
                  id: 'item-1',
                  codigo: 'ITM-001',
                  descripcion: 'Item Test 1',
                  cantidad: 2,
                  unidad: 'und',
                  precioElegido: 100,
                  costoElegido: 80, // 🎯 Este valor debe usarse para presupuestoTotal
                  costoReal: 75,    // 🎯 Este valor debe usarse para presupuestoEjecutado
                  estado: 'activo'
                },
                {
                  id: 'item-2',
                  codigo: 'ITM-002',
                  descripcion: 'Item Test 2',
                  cantidad: 3,
                  unidad: 'und',
                  precioElegido: 200,
                  costoElegido: 150, // 🎯 Este valor debe usarse para presupuestoTotal
                  costoReal: 140,    // 🎯 Este valor debe usarse para presupuestoEjecutado
                  estado: 'activo'
                }
              ]
            }
          ],
          pedidos: []
        }
      ]

      mockPrisma.proyecto.count.mockResolvedValue(1)
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos as any)

      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?page=1&limit=10')

      // 🎬 Act
      const response = await GET(request)
      const data = await response.json()

      // 🔍 Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      
      const proyecto = data.data[0]
      
      // 💰 Verificar cálculo de presupuestoTotal: (80 * 2) + (150 * 3) = 160 + 450 = 610
      expect(proyecto.presupuestoTotal).toBe(610)
      
      // 💰 Verificar cálculo de presupuestoEjecutado: (75 * 2) + (140 * 3) = 150 + 420 = 570
      expect(proyecto.presupuestoEjecutado).toBe(570)
      
      // ✅ Verificar otros campos
      expect(proyecto.nombre).toBe('Proyecto Test')
      expect(proyecto.codigo).toBe('PRY-001')
      expect(proyecto.cliente).toBe('Cliente Test')
      expect(proyecto.responsable).toBe('Comercial Test')
    })

    it('should handle projects with no lista items', async () => {
      // 📋 Arrange
      const mockProyectos = [
        {
          id: 'proyecto-2',
          nombre: 'Proyecto Sin Items',
          codigo: 'PRY-002',
          estado: 'activo',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-12-31'),
          updatedAt: new Date(),
          comercial: { name: 'Comercial Test', email: 'comercial@test.com' },
          gestor: null,
          cotizacion: {
            cliente: { nombre: 'Cliente Test 2', ruc: '12345678902' }
          },
          listaEquipos: [],
          pedidos: []
        }
      ]

      mockPrisma.proyecto.count.mockResolvedValue(1)
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos as any)

      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?page=1&limit=10')

      // 🎬 Act
      const response = await GET(request)
      const data = await response.json()

      // 🔍 Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      const proyecto = data.data[0]
      
      // 💰 Sin items, ambos presupuestos deben ser 0
      expect(proyecto.presupuestoTotal).toBe(0)
      expect(proyecto.presupuestoEjecutado).toBe(0)
    })

    it('should handle null/undefined costoElegido and costoReal values', async () => {
      // 📋 Arrange
      const mockProyectos = [
        {
          id: 'proyecto-3',
          nombre: 'Proyecto Con Nulls',
          codigo: 'PRY-003',
          estado: 'activo',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-12-31'),
          updatedAt: new Date(),
          comercial: { name: 'Comercial Test', email: 'comercial@test.com' },
          gestor: null,
          cotizacion: {
            cliente: { nombre: 'Cliente Test 3', ruc: '12345678903' }
          },
          listaEquipos: [
            {
              id: 'lista-3',
              estado: 'borrador',
              items: [
                {
                  id: 'item-3',
                  codigo: 'ITM-003',
                  descripcion: 'Item Con Nulls',
                  cantidad: 1,
                  unidad: 'und',
                  precioElegido: 100,
                  costoElegido: null, // 🎯 Valor null
                  costoReal: undefined, // 🎯 Valor undefined
                  estado: 'activo'
                }
              ]
            }
          ],
          pedidos: []
        }
      ]

      mockPrisma.proyecto.count.mockResolvedValue(1)
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos as any)

      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?page=1&limit=10')

      // 🎬 Act
      const response = await GET(request)
      const data = await response.json()

      // 🔍 Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      const proyecto = data.data[0]
      
      // 💰 Con valores null/undefined, ambos presupuestos deben ser 0
      expect(proyecto.presupuestoTotal).toBe(0)
      expect(proyecto.presupuestoEjecutado).toBe(0)
    })

    it('should return 401 when user is not authenticated', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?page=1&limit=10')

      // 🎬 Act
      const response = await GET(request)
      const data = await response.json()

      // 🔍 Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should apply search filters correctly', async () => {
      // 📋 Arrange
      mockPrisma.proyecto.count.mockResolvedValue(0)
      mockPrisma.proyecto.findMany.mockResolvedValue([])
      
      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?search=test&estado=activo&page=1&limit=5')

      // 🎬 Act
      const response = await GET(request)
      const data = await response.json()

      // 🔍 Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nombre: { contains: 'test', mode: 'insensitive' } },
              { codigo: { contains: 'test', mode: 'insensitive' } },
              { responsable: { contains: 'test', mode: 'insensitive' } }
            ]),
            estado: 'activo'
          }),
          skip: 0,
          take: 5
        })
      )
    })
  })
})
