// 🧪 Tests para API Routes - Tareas Gantt Chart
// ===================================================
// 📋 Descripción: Tests para endpoints de Gantt Chart de tareas
// 🔧 Funcionalidad: Validar obtención y transformación de datos Gantt
// 📅 Fecha: 2025-01-13
// 👤 Autor: Sistema GYS
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import type { GanttChartPayload } from '@/types/payloads'

// Create explicit mocks
const mockPrismaClient = {
  proyectoServicio: {
    findUnique: jest.fn(),
  },
  tarea: {
    findMany: jest.fn(),
  },
}

const mockGanttService = {
  calcularMetricasProyecto: jest.fn(),
  generarTimeline: jest.fn(),
  identificarRutaCritica: jest.fn(),
  analizarCargaTrabajo: jest.fn(),
}

// Use doMock to ensure proper module mocking
jest.doMock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
}))

jest.doMock('@/lib/services/gantt', () => ({
  __esModule: true,
  ...mockGanttService,
}))

// Use the mock client in tests
const mockPrisma = mockPrismaClient

// 📋 Datos de prueba
const mockProyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  estado: 'activo'
}

const mockTareas = [
  {
    id: 'tarea-1',
    nombre: 'Tarea Test 1',
    descripcion: 'Descripción test',
    estado: 'en_progreso',
    prioridad: 'alta',
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-01-15'),
    fechaInicioReal: null,
    fechaFinReal: null,
    progreso: 50,
    horasEstimadas: 40,
    horasReales: 20,
    responsable: {
      id: 'user-1',
      nombre: 'Usuario Test',
      email: 'test@example.com'
    },
    subtareas: [],
    dependenciasComoTareaPadre: [],
    dependenciasComoTareaHija: [],
    asignacionesRecurso: [],
    registrosProgreso: []
  }
]

const mockGanttData: GanttChartPayload = {
  proyectoId: 'proyecto-1',
  nombreProyecto: 'Proyecto Test',
  estadoProyecto: 'activo',
  tareas: [
    {
      id: 'tarea-1',
      nombre: 'Tarea Test 1',
      descripcion: 'Descripción test',
      estado: 'en_progreso',
      prioridad: 'alta',
      fechaInicio: '2025-01-01T00:00:00.000Z',
      fechaFin: '2025-01-15T00:00:00.000Z',
      fechaInicioReal: '2025-01-02T00:00:00.000Z',
      fechaFinReal: undefined,
      progreso: 50,
      horasEstimadas: 40,
      horasReales: 20,
      responsable: {
        id: 'user-1',
        nombre: 'Juan Pérez',
        email: 'juan@test.com'
      },
      subtareas: [],
      dependencias: {
        predecesoras: [],
        sucesoras: []
      },
      recursos: [],
      ultimosRegistros: []
    }
  ],
  fechaGeneracion: '2025-01-13T00:00:00.000Z'
}

describe('API Routes - Tareas Gantt Chart', () => {
  let GET: any

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
    
    // Import the route handler after mocks are set up
    const routeModule = await import('../../app/api/tareas/gantt/[proyectoId]/route')
    GET = routeModule.GET
  })

  describe('GET /api/tareas/gantt/[proyectoId]', () => {
    it('debería obtener datos del Gantt Chart para un proyecto válido', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockResolvedValue(mockProyecto)
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas)
      
      mockGanttService.calcularMetricasProyecto.mockReturnValue({
        progresoGeneral: 50,
        horasTotales: 40,
        horasCompletadas: 20,
        eficiencia: 200,
        fechaInicioProyecto: '2025-01-01T00:00:00.000Z',
        fechaFinProyecto: '2025-01-15T00:00:00.000Z',
        tareasTotal: 1,
        tareasCompletadas: 0,
        tareasPendientes: 0,
        tareasEnProgreso: 1
      })

      const request = new NextRequest('http://localhost/api/tareas/gantt/proyecto-1?includeTimeline=false&includeCriticalPath=false&includeWorkload=false')
      const params = { proyectoId: 'proyecto-1' }

      // 🔧 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.ganttData).toBeDefined()
      expect(data.ganttData.proyectoId).toBe('proyecto-1')
      expect(data.ganttData.tareas).toBeDefined()
      expect(data.ganttData.tareas).toHaveLength(1)
      expect(data.metricas).toBeDefined()
      expect(data.metricas.progresoGeneral).toBe(50)
    })

    it('debería retornar 404 si el proyecto no existe', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost/api/tareas/gantt/proyecto-inexistente')
      const params = { proyectoId: 'proyecto-inexistente' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Proyecto no encontrado')
    })

    it('debería aplicar filtros de fecha correctamente', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockResolvedValue(mockProyecto as any)
      mockPrisma.tarea.findMany.mockResolvedValue([])
      
      const fechaDesde = '2025-01-01T00:00:00.000Z'
      const fechaHasta = '2025-01-31T23:59:59.999Z'
      
      const request = new NextRequest(
        `http://localhost/api/tareas/gantt/proyecto-1?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`
      )
      const params = { proyectoId: 'proyecto-1' }

      // 🎯 Act
      const response = await GET(request, { params })

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            proyectoServicioId: 'proyecto-1',
            fechaInicio: {
              gte: new Date(fechaDesde)
            },
            fechaFin: {
              lte: new Date(fechaHasta)
            }
          })
        })
      )
    })

    it('debería incluir análisis opcionales según parámetros', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockResolvedValue(mockProyecto as any)
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      
      mockGanttService.calcularMetricasProyecto.mockReturnValue({} as any)
      mockGanttService.generarTimeline.mockReturnValue({
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-15',
        duracionDias: 14,
        hitos: []
      })
      mockGanttService.identificarRutaCritica.mockReturnValue({
        rutaCritica: ['tarea-1'],
        tareasRutaCritica: [],
        duracionRutaCritica: 14
      })
      mockGanttService.analizarCargaTrabajo.mockReturnValue({
        cargaPorAsignado: {},
        asignadosSobrecargados: []
      })

      const request = new NextRequest(
        'http://localhost/api/tareas/gantt/proyecto-1?includeWorkload=true&includeCriticalPath=true'
      )
      const params = { proyectoId: 'proyecto-1' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.timeline).toBeDefined()
      expect(data.rutaCritica).toBeDefined()
      expect(data.cargaTrabajo).toBeDefined()
      expect(mockGanttService.generarTimeline).toHaveBeenCalled()
      expect(mockGanttService.identificarRutaCritica).toHaveBeenCalled()
      expect(mockGanttService.analizarCargaTrabajo).toHaveBeenCalled()
    })

    it('debería manejar errores de validación de parámetros', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost/api/tareas/gantt/proyecto-1?fechaDesde=fecha-invalida')
      const params = { proyectoId: 'proyecto-1' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Parámetros inválidos')
      expect(data.details).toBeDefined()
    })

    it('debería manejar errores de base de datos', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockRejectedValue(new Error('Database error'))
      
      const request = new NextRequest('http://localhost/api/tareas/gantt/proyecto-1')
      const params = { proyectoId: 'proyecto-1' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })

    it('debería validar ID de proyecto requerido', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost/api/tareas/gantt/')
      const params = { proyectoId: '' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Parámetros inválidos')
    })

    it('debería transformar correctamente los datos de tareas a formato Gantt', async () => {
      // 📋 Arrange
      mockPrisma.proyectoServicio.findUnique.mockResolvedValue(mockProyecto as any)
      mockPrisma.tarea.findMany.mockResolvedValue(mockTareas as any)
      mockGanttService.calcularMetricasProyecto.mockReturnValue({} as any)

      const request = new NextRequest('http://localhost/api/tareas/gantt/proyecto-1')
      const params = { proyectoId: 'proyecto-1' }

      // 🎯 Act
      const response = await GET(request, { params })
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.ganttData.tareas[0]).toMatchObject({
        id: 'tarea-1',
        nombre: 'Tarea Test 1',
        estado: 'en_progreso',
        progreso: 50,
        responsable: {
          id: 'user-1',
          nombre: 'Usuario Test'
        }
      })
      expect(data.ganttData.tareas[0].fechaInicio).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})