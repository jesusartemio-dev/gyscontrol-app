// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Descripción: Tests unitarios para rutas API de tareas individuales (SERVER)
// 🧠 Uso: Jest + Node para rutas API del servidor
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import { EstadoTarea, PrioridadTarea } from '@prisma/client'

// 🔧 Mock de NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// 🔧 Mock de servicios
jest.mock('@/lib/services/tareas', () => ({
  getTareaById: jest.fn(),
  updateTarea: jest.fn(),
  deleteTarea: jest.fn(),
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

const mockTarea = {
  id: '1',
  titulo: 'Tarea Test',
  descripcion: 'Descripción de la tarea',
  estado: EstadoTarea.pendiente,
  prioridad: PrioridadTarea.alta,
  fechaInicio: new Date('2024-01-15'),
  fechaFin: new Date('2024-01-30'),
  progreso: 25,
  horasEstimadas: 40,
  horasReales: 10,
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-15'),
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    codigo: 'PROJ-001',
  },
  responsable: {
    id: 'user-1',
    name: 'Usuario Test',
    email: 'test@example.com',
  },
  subtareas: [
    {
      id: 'sub-1',
      titulo: 'Subtarea 1',
      estado: EstadoTarea.pendiente,
      progreso: 0,
    },
  ],
  _count: {
    subtareas: 1,
  },
}

const mockParams = { params: { id: '1' } }

describe('/api/tareas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de sesión autenticada por defecto
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/tareas/[id]', () => {
    it('debería obtener una tarea por ID', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockResolvedValue({ success: true, data: mockTarea })

      const request = new NextRequest('http://localhost:3000/api/tareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('1')
      expect(data.data.titulo).toBe('Tarea Test')
      expect(getTareaById).toHaveBeenCalledWith('1')
    })

    it('debería incluir relaciones en la respuesta', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockResolvedValue({ success: true, data: mockTarea })

      const request = new NextRequest('http://localhost:3000/api/tareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(data.data.proyecto).toBeDefined()
      expect(data.data.responsable).toBeDefined()
      expect(data.data.subtareas).toBeDefined()
      expect(data.data._count).toBeDefined()
      expect(data.data.proyecto.nombre).toBe('Proyecto Test')
      expect(data.data.responsable.name).toBe('Usuario Test')
      expect(data.data.subtareas).toHaveLength(1)
      expect(data.data._count.subtareas).toBe(1)
    })

    it('debería retornar 404 si la tarea no existe', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockResolvedValue({ success: false, message: 'Tarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/tareas/999')
      const params = { params: { id: '999' } }

      // 🎯 Act
      const response = await GET(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Tarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/tareas/invalid-id')
      const params = { params: { id: '' } }

      // 🎯 Act
      const response = await GET(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ID de tarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
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

      const request = new NextRequest('http://localhost:3000/api/tareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para acceder a tareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/tareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener tarea:',
        expect.any(Error)
      )
    })
  })

  describe('PUT /api/tareas/[id]', () => {
    const validUpdateData = {
      titulo: 'Tarea Actualizada',
      descripcion: 'Descripción actualizada',
      estado: EstadoTarea.en_progreso,
      prioridad: PrioridadTarea.alta,
      progreso: 75,
      horasEstimadas: 50,
      horasReales: 30,
      fechaInicio: '2024-01-20',
      fechaFin: '2024-02-05',
    }

    it('debería actualizar una tarea correctamente', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      const updatedTarea = {
        ...mockTarea,
        ...validUpdateData,
        fechaInicio: new Date(validUpdateData.fechaInicio),
        fechaFin: new Date(validUpdateData.fechaFin),
        updatedAt: new Date(),
      }
      updateTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.titulo).toBe('Tarea Actualizada')
      expect(data.data.progreso).toBe(75)
      expect(data.data.horasEstimadas).toBe(50)
      expect(updateTarea).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          titulo: 'Tarea Actualizada',
          estado: EstadoTarea.en_progreso,
          progreso: 75,
          horasEstimadas: 50,
        })
      )
    })

    it('debería actualizar campos parciales', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      const partialUpdate = { titulo: 'Nuevo Título', progreso: 50 }
      const updatedTarea = { ...mockTarea, ...partialUpdate }
      updateTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(partialUpdate),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(updateTarea).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          titulo: 'Nuevo Título',
          progreso: 50,
        })
      )
    })

    it('debería validar datos de entrada', async () => {
      // 📋 Arrange
      const invalidData = {
        titulo: 'Ab', // Muy corto
        progreso: 150, // Fuera del rango
        horasEstimadas: -5, // Negativo
        estado: 'estado_invalido',
      }

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Datos de entrada inválidos')
      expect(data.errors).toContain('El título debe tener al menos 3 caracteres')
      expect(data.errors).toContain('El progreso debe estar entre 0 y 100')
      expect(data.errors).toContain('Las horas estimadas deben ser positivas')
      expect(data.errors).toContain('Estado inválido')
    })

    it('debería validar fechas', async () => {
      // 📋 Arrange
      const invalidData = {
        fechaInicio: '2024-01-30',
        fechaFin: '2024-01-15', // Fecha fin anterior a fecha inicio
      }

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('La fecha de fin debe ser posterior a la fecha de inicio')
    })

    it('debería validar horas reales vs estimadas', async () => {
      // 📋 Arrange
      const invalidData = {
        horasEstimadas: 10,
        horasReales: 50, // Muy por encima de las estimadas
      }

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Las horas reales exceden significativamente las estimadas')
    })

    it('debería retornar 404 si la tarea no existe', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      updateTarea.mockResolvedValue({ success: false, message: 'Tarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/tareas/999', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = { params: { id: '999' } }

      // 🎯 Act
      const response = await PUT(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Tarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/tareas/invalid', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = { params: { id: '' } }

      // 🎯 Act
      const response = await PUT(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ID de tarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
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

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para actualizar tareas')
    })

    it('debería manejar JSON inválido', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Formato JSON inválido')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      updateTarea.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al actualizar tarea:',
        expect.any(Error)
      )
    })

    it('debería registrar la actualización exitosa', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      const updatedTarea = { ...mockTarea, ...validUpdateData }
      updateTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)

      // ✅ Assert
      const { logger } = require('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        'Tarea actualizada exitosamente:',
        expect.objectContaining({
          id: '1',
          titulo: 'Tarea Actualizada',
          userId: 'user-1',
        })
      )
    })
  })

  describe('DELETE /api/tareas/[id]', () => {
    it('debería eliminar una tarea correctamente', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Tarea eliminada exitosamente')
      expect(deleteTarea).toHaveBeenCalledWith('1')
    })

    it('debería retornar 404 si la tarea no existe', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({ success: false, message: 'Tarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/tareas/999', {
        method: 'DELETE',
      })
      const params = { params: { id: '999' } }

      // 🎯 Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Tarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/tareas/invalid', {
        method: 'DELETE',
      })
      const params = { params: { id: '' } }

      // 🎯 Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ID de tarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
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
        user: { ...mockSession.user, role: 'colaborador' },
      })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para eliminar tareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al eliminar tarea:',
        expect.any(Error)
      )
    })

    it('debería registrar la eliminación exitosa', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)

      // ✅ Assert
      const { logger } = require('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        'Tarea eliminada exitosamente:',
        expect.objectContaining({
          id: '1',
          userId: 'user-1',
        })
      )
    })

    it('debería manejar eliminación con subtareas', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({
        success: false,
        message: 'No se puede eliminar la tarea porque tiene subtareas asociadas',
      })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No se puede eliminar la tarea porque tiene subtareas asociadas')
    })

    it('debería manejar eliminación con dependencias', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({
        success: false,
        message: 'No se puede eliminar la tarea porque tiene dependencias',
      })

      const request = new NextRequest('http://localhost:3000/api/tareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No se puede eliminar la tarea porque tiene dependencias')
    })
  })
})
