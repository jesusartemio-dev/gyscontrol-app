// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Descripción: Tests unitarios para rutas API de subtareas (SERVER)
// 🧠 Uso: Jest + Node para rutas API del servidor
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { EstadoSubtarea, PrioridadSubtarea } from '@prisma/client'

// 🔧 Mock de NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// 🔧 Mock de servicios
jest.mock('@/lib/services/subtareas', () => ({
  getSubtareas: jest.fn(),
  createSubtarea: jest.fn(),
}))

// 🔧 Mock de logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// 🔧 Mock de auth config
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'proyectos',
  },
}

const mockSubtareas = [
  {
    id: '1',
    titulo: 'Subtarea 1',
    descripcion: 'Descripción de subtarea 1',
    estado: EstadoSubtarea.pendiente,
    prioridad: PrioridadSubtarea.alta,
    fechaInicio: new Date('2024-01-15'),
    fechaFin: new Date('2024-01-20'),
    progreso: 0,
    orden: 1,
    tareaId: 'tarea-1',
    responsableId: 'user-1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    titulo: 'Subtarea 2',
    descripcion: 'Descripción de subtarea 2',
    estado: EstadoSubtarea.en_progreso,
    prioridad: PrioridadSubtarea.media,
    fechaInicio: new Date('2024-01-16'),
    fechaFin: new Date('2024-01-25'),
    progreso: 50,
    orden: 2,
    tareaId: 'tarea-1',
    responsableId: 'user-2',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-16'),
  },
]

describe('/api/subtareas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de sesión autenticada por defecto
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/subtareas', () => {
    it('debería obtener subtareas con filtros básicos', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: mockSubtareas,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(getSubtareas).toHaveBeenCalledWith({
        tareaId: 'tarea-1',
        page: 1,
        limit: 10,
      })
    })

    it('debería obtener subtareas con filtros avanzados', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: [mockSubtareas[0]],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      const url = new URL(
        'http://localhost:3000/api/subtareas?tareaId=tarea-1&estado=pendiente&prioridad=alta&search=Subtarea&page=1&limit=5&sortBy=titulo&sortOrder=asc'
      )
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getSubtareas).toHaveBeenCalledWith({
        tareaId: 'tarea-1',
        estado: EstadoSubtarea.pendiente,
        prioridad: PrioridadSubtarea.alta,
        search: 'Subtarea',
        page: 1,
        limit: 5,
        sortBy: 'titulo',
        sortOrder: 'asc',
      })
    })

    it('debería filtrar por responsable', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: [mockSubtareas[0]],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1&responsableId=user-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(getSubtareas).toHaveBeenCalledWith({
        tareaId: 'tarea-1',
        responsableId: 'user-1',
        page: 1,
        limit: 10,
      })
    })

    it('debería filtrar por rango de fechas', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: mockSubtareas,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      const url = new URL(
        'http://localhost:3000/api/subtareas?tareaId=tarea-1&fechaInicio=2024-01-01&fechaFin=2024-01-31'
      )
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(getSubtareas).toHaveBeenCalledWith({
        tareaId: 'tarea-1',
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        page: 1,
        limit: 10,
      })
    })

    it('debería usar valores por defecto para paginación', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: mockSubtareas,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(getSubtareas).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      )
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No autorizado')
    })

    it('debería validar rol de usuario', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'comercial' },
      })

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para acceder a subtareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockRejectedValue(new Error('Database error'))

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener subtareas:',
        expect.any(Error)
      )
    })

    it('debería validar límite máximo de resultados', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: mockSubtareas,
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      })

      const url = new URL('http://localhost:3000/api/subtareas?tareaId=tarea-1&limit=200')
      const request = new NextRequest(url)

      // 🎯 Act
      const response = await GET(request)

      // ✅ Assert
      expect(getSubtareas).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Máximo permitido
        })
      )
    })
  })

  describe('POST /api/subtareas', () => {
    const validSubtareaData = {
      titulo: 'Nueva Subtarea',
      descripcion: 'Descripción de la nueva subtarea',
      estado: EstadoSubtarea.pendiente,
      prioridad: PrioridadSubtarea.media,
      fechaInicio: '2024-01-15',
      fechaFin: '2024-01-30',
      progreso: 0,
      tareaId: 'tarea-1',
      responsableId: 'user-1',
    }

    it('debería crear una nueva subtarea correctamente', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      const newSubtarea = {
        id: '3',
        ...validSubtareaData,
        fechaInicio: new Date(validSubtareaData.fechaInicio),
        fechaFin: new Date(validSubtareaData.fechaFin),
        orden: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createSubtarea.mockResolvedValue({ success: true, data: newSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(validSubtareaData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('3')
      expect(data.data.titulo).toBe('Nueva Subtarea')
      expect(createSubtarea).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Nueva Subtarea',
          descripcion: 'Descripción de la nueva subtarea',
          tareaId: 'tarea-1',
          responsableId: 'user-1',
        })
      )
    })

    it('debería crear subtarea con datos mínimos', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      const minimalData = {
        titulo: 'Subtarea Mínima',
        tareaId: 'tarea-1',
        responsableId: 'user-1',
      }
      const newSubtarea = {
        id: '3',
        ...minimalData,
        descripcion: null,
        estado: EstadoSubtarea.pendiente,
        prioridad: PrioridadSubtarea.media,
        fechaInicio: null,
        fechaFin: null,
        progreso: 0,
        orden: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createSubtarea.mockResolvedValue({ success: true, data: newSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(minimalData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(createSubtarea).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Subtarea Mínima',
          tareaId: 'tarea-1',
          responsableId: 'user-1',
        })
      )
    })

    it('debería validar campos requeridos', async () => {
      // 📋 Arrange
      const invalidData = {
        descripcion: 'Descripción sin título',
        // Falta titulo, tareaId, responsableId
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Datos de entrada inválidos')
      expect(data.errors).toContain('El título es requerido')
      expect(data.errors).toContain('La tarea es requerida')
      expect(data.errors).toContain('El responsable es requerido')
    })

    it('debería validar longitud del título', async () => {
      // 📋 Arrange
      const invalidData = {
        titulo: 'Ab', // Muy corto
        tareaId: 'tarea-1',
        responsableId: 'user-1',
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('El título debe tener al menos 3 caracteres')
    })

    it('debería validar valores de enum', async () => {
      // 📋 Arrange
      const invalidData = {
        titulo: 'Subtarea Test',
        estado: 'estado_invalido',
        prioridad: 'prioridad_invalida',
        tareaId: 'tarea-1',
        responsableId: 'user-1',
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Estado inválido')
      expect(data.errors).toContain('Prioridad inválida')
    })

    it('debería validar rango de progreso', async () => {
      // 📋 Arrange
      const invalidData = {
        titulo: 'Subtarea Test',
        progreso: 150, // Fuera del rango 0-100
        tareaId: 'tarea-1',
        responsableId: 'user-1',
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('El progreso debe estar entre 0 y 100')
    })

    it('debería validar fechas', async () => {
      // 📋 Arrange
      const invalidData = {
        titulo: 'Subtarea Test',
        fechaInicio: '2024-01-30',
        fechaFin: '2024-01-15', // Fecha fin anterior a fecha inicio
        tareaId: 'tarea-1',
        responsableId: 'user-1',
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('La fecha de fin debe ser posterior a la fecha de inicio')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(validSubtareaData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No autorizado')
    })

    it('debería validar permisos de rol', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'comercial' },
      })

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(validSubtareaData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para crear subtareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      createSubtarea.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(validSubtareaData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al crear subtarea:',
        expect.any(Error)
      )
    })

    it('debería manejar JSON inválido', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Formato JSON inválido')
    })

    it('debería registrar la creación exitosa', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      const newSubtarea = {
        id: '3',
        ...validSubtareaData,
        fechaInicio: new Date(validSubtareaData.fechaInicio),
        fechaFin: new Date(validSubtareaData.fechaFin),
        orden: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createSubtarea.mockResolvedValue({ success: true, data: newSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas', {
        method: 'POST',
        body: JSON.stringify(validSubtareaData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await POST(request)

      // ✅ Assert
      const { logger } = require('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        'Subtarea creada exitosamente:',
        expect.objectContaining({
          id: '3',
          titulo: 'Nueva Subtarea',
          userId: 'user-1',
        })
      )
    })
  })
})
