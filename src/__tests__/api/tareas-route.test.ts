// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Descripción: Tests unitarios para API routes de tareas (SERVER)
// 🧠 Uso: Jest + Node environment para rutas API
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import * as tareasService from '@/lib/services/tareas'
import { EstadoTarea, PrioridadTarea } from '@prisma/client'

// 🔧 Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// 🔧 Mock servicio de tareas
jest.mock('@/lib/services/tareas', () => ({
  getTareas: jest.fn(),
  createTarea: jest.fn(),
  getMetricasTareas: jest.fn(),
}))

// 🔧 Mock logger
jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockTareasService = tareasService as jest.Mocked<typeof tareasService>

describe('API Routes - Tareas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tareas', () => {
    it('debería obtener tareas con filtros y paginación', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      const mockTareas = {
        data: [
          {
            id: '1',
            titulo: 'Tarea Test',
            descripcion: 'Descripción test',
            estado: EstadoTarea.pendiente,
            prioridad: PrioridadTarea.media,
            fechaInicio: new Date('2024-01-15'),
            fechaFin: new Date('2024-01-30'),
            progreso: 0,
            proyectoId: 'proyecto-1',
            responsableId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }

      mockTareasService.getTareas.mockResolvedValue(mockTareas)

      const url = new URL('http://localhost:3000/api/tareas?proyectoId=proyecto-1&page=1&limit=10')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.data[0].titulo).toBe('Tarea Test')
      expect(mockTareasService.getTareas).toHaveBeenCalledWith({
        proyectoId: 'proyecto-1',
        page: 1,
        limit: 10,
      })
    })

    it('debería manejar filtros de búsqueda', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'admin' },
      } as any)

      mockTareasService.getTareas.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })

      const url = new URL('http://localhost:3000/api/tareas?search=test&estado=pendiente&prioridad=alta')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(mockTareasService.getTareas).toHaveBeenCalledWith({
        search: 'test',
        estado: EstadoTarea.pendiente,
        prioridad: PrioridadTarea.alta,
        page: 1,
        limit: 10,
      })
    })

    it('debería incluir métricas cuando se soliciten', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'gerente' },
      } as any)

      const mockMetricas = {
        total: 10,
        completadas: 3,
        enProgreso: 4,
        pendientes: 3,
        porcentajeCompletado: 30,
        prioridadAlta: 2,
        prioridadMedia: 5,
        prioridadBaja: 3,
      }

      mockTareasService.getTareas.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })
      mockTareasService.getMetricasTareas.mockResolvedValue(mockMetricas)

      const url = new URL('http://localhost:3000/api/tareas?includeMetrics=true&proyectoId=proyecto-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.metricas).toEqual(mockMetricas)
      expect(mockTareasService.getMetricasTareas).toHaveBeenCalledWith('proyecto-1')
    })

    it('debería retornar 401 si no está autenticado', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue(null)

      const url = new URL('http://localhost:3000/api/tareas')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      mockTareasService.getTareas.mockRejectedValue(new Error('Database error'))

      const url = new URL('http://localhost:3000/api/tareas')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })

  describe('POST /api/tareas', () => {
    it('debería crear una nueva tarea', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      const payload = {
        titulo: 'Nueva Tarea',
        descripcion: 'Descripción de la nueva tarea',
        estado: EstadoTarea.pendiente,
        prioridad: PrioridadTarea.alta,
        fechaInicio: '2024-01-15T00:00:00.000Z',
        fechaFin: '2024-01-30T00:00:00.000Z',
        proyectoId: 'proyecto-1',
        responsableId: 'user-1',
      }

      const mockTareaCreada = {
        id: '1',
        ...payload,
        fechaInicio: new Date(payload.fechaInicio),
        fechaFin: new Date(payload.fechaFin),
        progreso: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTareasService.createTarea.mockResolvedValue(mockTareaCreada)

      const request = new NextRequest('http://localhost:3000/api/tareas', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(201)
      expect(data.titulo).toBe('Nueva Tarea')
      expect(data.progreso).toBe(0)
      expect(mockTareasService.createTarea).toHaveBeenCalledWith({
        ...payload,
        fechaInicio: new Date(payload.fechaInicio),
        fechaFin: new Date(payload.fechaFin),
      })
    })

    it('debería validar datos requeridos', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      const payloadInvalido = {
        titulo: '', // título vacío
        proyectoId: 'proyecto-1',
      }

      const request = new NextRequest('http://localhost:3000/api/tareas', {
        method: 'POST',
        body: JSON.stringify(payloadInvalido),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Errores de validación')
    })

    it('debería retornar 401 si no está autenticado', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tareas', {
        method: 'POST',
        body: JSON.stringify({ titulo: 'Test' }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('debería manejar JSON inválido', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tareas', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('JSON inválido')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'proyectos' },
      } as any)

      const payload = {
        titulo: 'Nueva Tarea',
        descripcion: 'Descripción',
        estado: EstadoTarea.pendiente,
        prioridad: PrioridadTarea.media,
        fechaInicio: '2024-01-15T00:00:00.000Z',
        fechaFin: '2024-01-30T00:00:00.000Z',
        proyectoId: 'proyecto-1',
        responsableId: 'user-1',
      }

      mockTareasService.createTarea.mockRejectedValue(new Error('Database constraint violation'))

      const request = new NextRequest('http://localhost:3000/api/tareas', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })

  describe('Validación de parámetros', () => {
    it('debería validar enum de estado correctamente', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'admin' },
      } as any)

      mockTareasService.getTareas.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })

      const url = new URL('http://localhost:3000/api/tareas?estado=estado_invalido')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      // El estado inválido debería ser ignorado, no incluido en los filtros
      expect(mockTareasService.getTareas).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      })
    })

    it('debería validar parámetros de paginación', async () => {
      // 📋 Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'admin' },
      } as any)

      mockTareasService.getTareas.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })

      const url = new URL('http://localhost:3000/api/tareas?page=0&limit=200')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(response.status).toBe(200)
      // Los valores inválidos deberían usar los defaults
      expect(mockTareasService.getTareas).toHaveBeenCalledWith({
        page: 1, // mínimo 1
        limit: 50, // máximo 50
      })
    })
  })
})