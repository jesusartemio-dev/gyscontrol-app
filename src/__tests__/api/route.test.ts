// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Ubicación: src/app/api/finanzas/aprovisionamiento/proyectos/__tests__/
// 🔧 Descripción: Tests para el endpoint API de aprovisionamiento financiero
//
// 🧠 Funcionalidades testeadas:
// - GET /api/finanzas/aprovisionamiento/proyectos
// - Validación de parámetros
// - Filtros y paginación
// - Manejo de errores
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { GET } from '@/app/api/finanzas/aprovisionamiento/proyectos/route'
import { NextRequest } from 'next/server'

// 🔧 Mock de Prisma
const mockPrisma = {
  proyecto: {
    findMany: jest.fn(),
    count: jest.fn()
  }
}

// 🔧 Mock del cliente Prisma
jest.mock('../../../../../../lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}))

// 🔧 Mock de logger
jest.mock('../../../../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

// 🔧 Helper para crear NextRequest mock
function createMockRequest(searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  
  return {
    nextUrl: url,
    url: url.toString()
  } as NextRequest
}

// 🔧 Datos mock para proyectos
const mockProyectos = [
  {
    id: '1',
    nombre: 'Proyecto Alpha',
    codigo: 'PRY-001',
    responsable: {
      id: '1',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@gys.com'
    },
    estado: 'activo',
    presupuestoTotal: 150000,
    presupuestoEjecutado: 75000,
    progreso: 50,
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    moneda: 'PEN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    nombre: 'Proyecto Beta',
    codigo: 'PRY-002',
    responsable: {
      id: '2',
      nombre: 'María',
      apellido: 'García',
      email: 'maria.garcia@gys.com'
    },
    estado: 'pausado',
    presupuestoTotal: 200000,
    presupuestoEjecutado: 40000,
    progreso: 20,
    fechaInicio: new Date('2024-02-01'),
    fechaFin: new Date('2024-11-30'),
    moneda: 'USD',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15')
  }
]

describe('/api/finanzas/aprovisionamiento/proyectos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('✅ debe retornar proyectos sin filtros', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      const request = createMockRequest()

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      })
      expect(data.kpis).toBeDefined()
      expect(data.kpis.totalProyectos).toBe(2)
    })

    it('✅ debe aplicar filtro de búsqueda', async () => {
      // 🔧 Arrange
      const filteredProjects = [mockProyectos[0]]
      mockPrisma.proyecto.findMany.mockResolvedValue(filteredProjects)
      
      const request = createMockRequest({
        search: 'Alpha'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nombre: { contains: 'Alpha', mode: 'insensitive' } },
              { codigo: { contains: 'Alpha', mode: 'insensitive' } }
            ])
          })
        })
      )
    })

    it('✅ debe aplicar filtro de estado', async () => {
      // 🔧 Arrange
      const activeProjects = [mockProyectos[0]]
      mockPrisma.proyecto.findMany.mockResolvedValue(activeProjects)
      
      const request = createMockRequest({
        estado: 'activo'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'activo'
          })
        })
      )
    })

    it('✅ debe aplicar filtro de responsable', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue([mockProyectos[0]])
      
      const request = createMockRequest({
        responsable: '1'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            responsableId: '1'
          })
        })
      )
    })

    it('✅ debe aplicar filtros de fecha', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      
      const request = createMockRequest({
        fechaInicio: '2024-01-01',
        fechaFin: '2024-12-31'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fechaInicio: { gte: new Date('2024-01-01T00:00:00.000Z') },
            fechaFin: { lte: new Date('2024-12-31T23:59:59.999Z') }
          })
        })
      )
    })

    it('✅ debe aplicar paginación', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue([mockProyectos[1]])
      
      const request = createMockRequest({
        page: '2',
        limit: '1'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1
        })
      )
      expect(data.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 1,
        pages: 1
      })
    })

    it('✅ debe filtrar proyectos con alertas', async () => {
      // 🔧 Arrange
      const projectsWithAlerts = mockProyectos.map(p => ({
        ...p,
        // Simular alertas basadas en progreso y fechas
        alertas: p.progreso < 30 ? 2 : 0
      }))
      
      mockPrisma.proyecto.findMany.mockResolvedValue(projectsWithAlerts)
      
      const request = createMockRequest({
        alertas: 'true'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Debe filtrar solo proyectos con alertas > 0
      const proyectosConAlertas = data.data.filter((p: any) => p.alertas > 0)
      expect(proyectosConAlertas.length).toBeGreaterThan(0)
    })

    it('✅ debe calcular KPIs correctamente', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      const request = createMockRequest()

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.kpis).toEqual({
        totalProyectos: 2,
        proyectosActivos: 1,
        proyectosPausados: 1,
        presupuestoTotal: 350000, // 150000 + 200000
        presupuestoEjecutado: 115000, // 75000 + 40000
        alertasActivas: expect.any(Number)
      })
    })

    it('✅ debe usar valores por defecto para paginación', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      const request = createMockRequest()

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      )
    })

    it('✅ debe ignorar filtros "todos"', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      
      const request = createMockRequest({
        estado: 'todos',
        responsable: 'todos'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            estado: 'todos',
            responsableId: 'todos'
          })
        })
      )
    })

    it('❌ debe manejar errores de base de datos', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockRejectedValue(new Error('Database error'))
      const request = createMockRequest()

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Error interno del servidor')
    })

    it('❌ debe validar parámetros inválidos', async () => {
      // 🔧 Arrange
      const request = createMockRequest({
        page: 'invalid',
        limit: 'invalid'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert - Debe usar valores por defecto cuando los parámetros son inválidos
      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })

    it('✅ debe incluir relaciones en la consulta', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      const request = createMockRequest()

      // 🎯 Act
      await GET(request)

      // ✅ Assert
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            responsable: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true
              }
            }
          })
        })
      )
    })

    it('✅ debe ordenar por fechaInicio descendente', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      const request = createMockRequest()

      // 🎯 Act
      await GET(request)

      // ✅ Assert
      expect(mockPrisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            fechaInicio: 'desc'
          }
        })
      )
    })
  })

  describe('Validación de esquemas', () => {
    it('✅ debe coercionar tipos correctamente', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue([])
      
      const request = createMockRequest({
        page: '2',
        limit: '5',
        alertas: 'true'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })

    it('✅ debe manejar valores booleanos como string', async () => {
      // 🔧 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      
      const request = createMockRequest({
        alertas: 'false'
      })

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})