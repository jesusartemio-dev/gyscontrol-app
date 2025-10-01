// ===================================================
// 📁 Archivo: tareas-progreso-route.test.ts
// 📌 Descripción: Tests unitarios para API estadísticas de progreso (SERVER)
// 🧠 Uso: Jest + Node environment para rutas API especializadas
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/tareas/progreso/route'
import { prisma } from '@/lib/prisma'
import type { EstadoTarea, PrioridadTarea } from '@/types/modelos'

// 🔧 Mock Prisma
const mockPrismaClient = {
  tarea: {
    findMany: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}))

const mockPrisma = mockPrismaClient as any

// 📋 Datos de prueba
const mockTareas = [
  {
    id: 'tarea-1',
    nombre: 'Tarea Completada',
    estado: 'completada' as EstadoTarea,
    prioridad: 'alta' as PrioridadTarea,
    progreso: 100,
    horasEstimadas: 40,
    horasReales: 35,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-01-10'),
    fechaFinReal: new Date('2025-01-08'),
    responsable: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@test.com'
    },
    proyectoServicio: {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      estado: 'activo'
    },
    subtareas: [
      {
        id: 'subtarea-1',
        estado: 'completada' as EstadoTarea,
        progreso: 100,
        horasEstimadas: 20,
        horasReales: 18
      }
    ],
    registrosProgreso: [
      {
        fecha: new Date('2025-01-05'),
        progreso: 50,
        horasTrabajadas: 20
      },
      {
        fecha: new Date('2025-01-08'),
        progreso: 100,
        horasTrabajadas: 15
      }
    ]
  },
  {
    id: 'tarea-2',
    nombre: 'Tarea En Progreso',
    estado: 'en_progreso' as EstadoTarea,
    prioridad: 'media' as PrioridadTarea,
    progreso: 60,
    horasEstimadas: 30,
    horasReales: 25,
    fechaInicio: new Date('2025-01-05'),
    fechaFin: new Date('2025-01-20'),
    fechaFinReal: null,
    responsable: {
      id: 'user-2',
      nombre: 'María García',
      email: 'maria@test.com'
    },
    proyectoServicio: {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      estado: 'activo'
    },
    subtareas: [],
    registrosProgreso: []
  },
  {
    id: 'tarea-3',
    nombre: 'Tarea Pendiente',
    estado: 'pendiente' as EstadoTarea,
    prioridad: 'baja' as PrioridadTarea,
    progreso: 0,
    horasEstimadas: 20,
    horasReales: 0,
    fechaInicio: new Date('2025-01-15'),
    fechaFin: new Date('2025-01-25'),
    fechaFinReal: null,
    responsable: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@test.com'
    },
    proyectoServicio: {
      id: 'proyecto-2',
      nombre: 'Proyecto Test 2',
      estado: 'activo'
    },
    subtareas: [],
    registrosProgreso: []
  }
]

describe('API Routes - Tareas Progreso', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tareas/progreso', () => {
    it('debería obtener estadísticas básicas de progreso', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.resumen).toMatchObject({
        totalTareas: 3,
        tareasCompletadas: 1,
        tareasEnProgreso: 1,
        tareasPendientes: 1,
        tareasCanceladas: 0,
        porcentajeCompletado: 33.33,
        progresoPromedio: 53.33
      })
    })

    it('debería calcular métricas de rendimiento correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.rendimiento).toMatchObject({
        horasEstimadas: 90, // 40 + 30 + 20
        horasReales: 60,    // 35 + 25 + 0
        eficiencia: 150,    // (90/60) * 100
        desviacionTiempo: -30, // 60 - 90
        tareasAtrasadas: 0,
        tareasAdelantadas: 1
      })
    })

    it('debería generar distribución por estado correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.distribucion.porEstado).toMatchObject({
        pendiente: 1,
        en_progreso: 1,
        completada: 1,
        cancelada: 0,
        pausada: 0
      })
    })

    it('debería generar distribución por prioridad correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.distribucion.porPrioridad).toMatchObject({
        baja: 1,
        media: 1,
        alta: 1,
        critica: 0
      })
    })

    it('debería calcular estadísticas por responsable', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(data.distribucion.porResponsable).toHaveLength(2)
      
      const juanStats = data.distribucion.porResponsable.find(
        (r: any) => r.responsableId === 'user-1'
      )
      expect(juanStats).toMatchObject({
        responsableId: 'user-1',
        nombreResponsable: 'Juan Pérez',
        totalTareas: 2,
        tareasCompletadas: 1,
        progresoPromedio: 50, // (100 + 0) / 2
        eficiencia: 171.43   // ((40 + 20) / (35 + 0)) * 100
      })
    })

    it('debería aplicar filtro por proyecto correctamente', async () => {
      // 📋 Arrange
      const tareasProyecto1 = mockTareas.filter(t => 
        t.proyectoServicio.id === 'proyecto-1'
      )
      mockPrisma.tarea.findMany.mockResolvedValue(tareasProyecto1 as any)
      
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?proyectoServicioId=proyecto-1'
      )

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            proyectoServicioId: 'proyecto-1'
          }
        })
      )
      expect(data.resumen.totalTareas).toBe(2)
    })

    it('debería aplicar filtro por responsable correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?responsableId=user-1'
      )

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            responsableId: 'user-1'
          }
        })
      )
    })

    it('debería aplicar filtros de fecha correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const fechaDesde = '2025-01-01T00:00:00.000Z'
      const fechaHasta = '2025-01-31T23:59:59.999Z'
      
      const request = new NextRequest(
        `http://localhost/api/tareas/progreso?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`
      )

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            fechaInicio: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta)
            }
          }
        })
      )
    })

    it('debería incluir subtareas cuando se solicite', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?includeSubtareas=true'
      )

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            subtareas: {
              select: {
                id: true,
                estado: true,
                progreso: true,
                horasEstimadas: true,
                horasReales: true
              }
            }
          })
        })
      )
    })

    it('debería incluir tendencias históricas cuando se solicite', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?includeHistorico=true'
      )

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.tendencias).toBeDefined()
      expect(data.tendencias.progresoSemanal).toHaveLength(12)
      expect(data.tendencias.rendimientoMensual).toHaveLength(6)
    })

    it('debería manejar errores de validación de parámetros', async () => {
      // 📋 Arrange
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?fechaDesde=fecha-invalida'
      )

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Parámetros inválidos')
      expect(data.details).toBeDefined()
    })

    it('debería manejar errores de base de datos', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockRejectedValue(new Error('Database error'))
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })

    it('debería manejar caso sin tareas correctamente', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue([])
      
      const request = new NextRequest('http://localhost/api/tareas/progreso')

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.resumen).toMatchObject({
        totalTareas: 0,
        tareasCompletadas: 0,
        tareasEnProgreso: 0,
        tareasPendientes: 0,
        tareasCanceladas: 0,
        porcentajeCompletado: 0,
        progresoPromedio: 0
      })
      expect(data.distribucion.porResponsable).toHaveLength(0)
    })

    it('debería validar parámetros de groupBy', async () => {
      // 📋 Arrange
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      const request = new NextRequest(
        'http://localhost/api/tareas/progreso?groupBy=responsable'
      )

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      // El groupBy se valida pero no afecta la lógica actual
    })
  })
})
