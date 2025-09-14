// ===================================================
// 📁 Archivo: route.test.ts
// 📌 Descripción: Tests unitarios para rutas API de subtareas individuales (SERVER)
// 🧠 Uso: Jest + Node para rutas API del servidor
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import { EstadoSubtarea, PrioridadSubtarea } from '@prisma/client'

// 🔧 Mock de NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// 🔧 Mock de servicios
jest.mock('@/lib/services/subtareas', () => ({
  getSubtareaById: jest.fn(),
  updateSubtarea: jest.fn(),
  deleteSubtarea: jest.fn(),
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

const mockSubtarea = {
  id: '1',
  titulo: 'Subtarea Test',
  descripcion: 'Descripción de la subtarea',
  estado: EstadoSubtarea.pendiente,
  prioridad: PrioridadSubtarea.alta,
  fechaInicio: new Date('2024-01-15'),
  fechaFin: new Date('2024-01-30'),
  progreso: 25,
  orden: 1,
  tareaId: 'tarea-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-15'),
  tarea: {
    id: 'tarea-1',
    titulo: 'Tarea Principal',
    proyectoId: 'proyecto-1',
  },
  responsable: {
    id: 'user-1',
    name: 'Usuario Test',
    email: 'test@example.com',
  },
}

const mockParams = { params: { id: '1' } }

describe('/api/subtareas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de sesión autenticada por defecto
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/subtareas/[id]', () => {
    it('debería obtener una subtarea por ID', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockResolvedValue({ success: true, data: mockSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('1')
      expect(data.data.titulo).toBe('Subtarea Test')
      expect(getSubtareaById).toHaveBeenCalledWith('1')
    })

    it('debería incluir relaciones en la respuesta', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockResolvedValue({ success: true, data: mockSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(data.data.tarea).toBeDefined()
      expect(data.data.responsable).toBeDefined()
      expect(data.data.tarea.titulo).toBe('Tarea Principal')
      expect(data.data.responsable.name).toBe('Usuario Test')
    })

    it('debería retornar 404 si la subtarea no existe', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockResolvedValue({ success: false, message: 'Subtarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/subtareas/999')
      const params = { params: { id: '999' } }

      // 🎯 Act
      const response = await GET(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Subtarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/subtareas/invalid-id')
      const params = { params: { id: '' } }

      // 🎯 Act
      const response = await GET(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ID de subtarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subtareas/1')

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

      const request = new NextRequest('http://localhost:3000/api/subtareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para acceder a subtareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/subtareas/1')

      // 🎯 Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Error interno del servidor')

      const { logger } = require('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener subtarea:',
        expect.any(Error)
      )
    })
  })

  describe('PUT /api/subtareas/[id]', () => {
    const validUpdateData = {
      titulo: 'Subtarea Actualizada',
      descripcion: 'Descripción actualizada',
      estado: EstadoSubtarea.en_progreso,
      prioridad: PrioridadSubtarea.alta,
      progreso: 75,
      fechaInicio: '2024-01-20',
      fechaFin: '2024-02-05',
    }

    it('debería actualizar una subtarea correctamente', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      const updatedSubtarea = {
        ...mockSubtarea,
        ...validUpdateData,
        fechaInicio: new Date(validUpdateData.fechaInicio),
        fechaFin: new Date(validUpdateData.fechaFin),
        updatedAt: new Date(),
      }
      updateSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
      expect(data.data.titulo).toBe('Subtarea Actualizada')
      expect(data.data.progreso).toBe(75)
      expect(updateSubtarea).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          titulo: 'Subtarea Actualizada',
          estado: EstadoSubtarea.en_progreso,
          progreso: 75,
        })
      )
    })

    it('debería actualizar campos parciales', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      const partialUpdate = { titulo: 'Nuevo Título', progreso: 50 }
      const updatedSubtarea = { ...mockSubtarea, ...partialUpdate }
      updateSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
      expect(updateSubtarea).toHaveBeenCalledWith(
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
        estado: 'estado_invalido',
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
      expect(data.errors).toContain('Estado inválido')
    })

    it('debería validar fechas', async () => {
      // 📋 Arrange
      const invalidData = {
        fechaInicio: '2024-01-30',
        fechaFin: '2024-01-15', // Fecha fin anterior a fecha inicio
      }

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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

    it('debería retornar 404 si la subtarea no existe', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      updateSubtarea.mockResolvedValue({ success: false, message: 'Subtarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/subtareas/999', {
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
      expect(data.message).toBe('Subtarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/subtareas/invalid', {
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
      expect(data.message).toBe('ID de subtarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
      expect(data.message).toBe('Sin permisos para actualizar subtareas')
    })

    it('debería manejar JSON inválido', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
      const { updateSubtarea } = require('@/lib/services/subtareas')
      updateSubtarea.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
        'Error al actualizar subtarea:',
        expect.any(Error)
      )
    })

    it('debería registrar la actualización exitosa', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      const updatedSubtarea = { ...mockSubtarea, ...validUpdateData }
      updateSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      // 🎯 Act
      const response = await PUT(request, mockParams)

      // ✅ Assert
      const { logger } = require('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        'Subtarea actualizada exitosamente:',
        expect.objectContaining({
          id: '1',
          titulo: 'Subtarea Actualizada',
          userId: 'user-1',
        })
      )
    })
  })

  describe('DELETE /api/subtareas/[id]', () => {
    it('debería eliminar una subtarea correctamente', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Subtarea eliminada exitosamente')
      expect(deleteSubtarea).toHaveBeenCalledWith('1')
    })

    it('debería retornar 404 si la subtarea no existe', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({ success: false, message: 'Subtarea no encontrada' })

      const request = new NextRequest('http://localhost:3000/api/subtareas/999', {
        method: 'DELETE',
      })
      const params = { params: { id: '999' } }

      // 🎯 Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Subtarea no encontrada')
    })

    it('debería validar formato del ID', async () => {
      // 📋 Arrange
      const request = new NextRequest('http://localhost:3000/api/subtareas/invalid', {
        method: 'DELETE',
      })
      const params = { params: { id: '' } }

      // 🎯 Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ID de subtarea inválido')
    })

    it('debería requerir autenticación', async () => {
      // 📋 Arrange
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Sin permisos para eliminar subtareas')
    })

    it('debería manejar errores del servicio', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
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
        'Error al eliminar subtarea:',
        expect.any(Error)
      )
    })

    it('debería registrar la eliminación exitosa', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)

      // ✅ Assert
      const { logger } = require('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        'Subtarea eliminada exitosamente:',
        expect.objectContaining({
          id: '1',
          userId: 'user-1',
        })
      )
    })

    it('debería manejar eliminación con dependencias', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({
        success: false,
        message: 'No se puede eliminar la subtarea porque tiene dependencias',
      })

      const request = new NextRequest('http://localhost:3000/api/subtareas/1', {
        method: 'DELETE',
      })

      // 🎯 Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No se puede eliminar la subtarea porque tiene dependencias')
    })
  })
})