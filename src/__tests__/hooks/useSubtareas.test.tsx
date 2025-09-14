// ===================================================
// 📁 Archivo: useSubtareas.test.tsx
// 📌 Descripción: Tests unitarios para hook useSubtareas (CLIENT)
// 🧠 Uso: React Testing Library + Jest para hooks cliente
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { renderHook, act, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { useSubtareas } from '../useSubtareas'
import { EstadoSubtarea, PrioridadSubtarea } from '@prisma/client'
import type { Subtarea, CreateSubtareaPayload, UpdateSubtareaPayload } from '@/types/modelos'

// 🔧 Mock de servicios
jest.mock('@/lib/services/subtareas', () => ({
  getSubtareas: jest.fn(),
  getSubtareaById: jest.fn(),
  createSubtarea: jest.fn(),
  updateSubtarea: jest.fn(),
  deleteSubtarea: jest.fn(),
  reorderSubtareas: jest.fn(),
  duplicateSubtarea: jest.fn(),
  updateProgresoSubtarea: jest.fn(),
  getMetricasSubtareas: jest.fn(),
}))

// 🔧 Mock de toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

const mockSubtarea: Subtarea = {
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

const mockSubtareas = [mockSubtarea]

const mockMetricas = {
  total: 5,
  pendientes: 2,
  enProgreso: 2,
  completadas: 1,
  progresoPromedio: 60,
  tiempoPromedio: 3.5,
  eficiencia: 85,
}

describe('useSubtareas Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de servicios por defecto
    const { getSubtareas, getMetricasSubtareas } = require('@/lib/services/subtareas')
    getSubtareas.mockResolvedValue({ success: true, data: mockSubtareas })
    getMetricasSubtareas.mockResolvedValue({ success: true, data: mockMetricas })
  })

  describe('Estado inicial', () => {
    it('debería inicializar con valores por defecto', () => {
      // 🎯 Act
      const { result } = renderHook(() => useSubtareas())

      // ✅ Assert
      expect(result.current.subtareas).toEqual([])
      expect(result.current.metricas).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.filters).toEqual({
        search: '',
        estado: undefined,
        prioridad: undefined,
        tareaId: undefined,
        responsableId: undefined,
      })
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      })
    })

    it('debería tener todas las funciones disponibles', () => {
      // 🎯 Act
      const { result } = renderHook(() => useSubtareas())

      // ✅ Assert
      expect(typeof result.current.fetchSubtareas).toBe('function')
      expect(typeof result.current.fetchSubtareaById).toBe('function')
      expect(typeof result.current.createSubtarea).toBe('function')
      expect(typeof result.current.updateSubtarea).toBe('function')
      expect(typeof result.current.deleteSubtarea).toBe('function')
      expect(typeof result.current.reorderSubtareas).toBe('function')
      expect(typeof result.current.duplicateSubtarea).toBe('function')
      expect(typeof result.current.updateProgreso).toBe('function')
      expect(typeof result.current.fetchMetricas).toBe('function')
      expect(typeof result.current.setFilters).toBe('function')
      expect(typeof result.current.setPagination).toBe('function')
      expect(typeof result.current.resetFilters).toBe('function')
    })
  })

  describe('fetchSubtareas', () => {
    it('debería cargar subtareas exitosamente', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // ✅ Assert
      await waitFor(() => {
        expect(result.current.subtareas).toEqual(mockSubtareas)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
      })

      const { getSubtareas } = require('@/lib/services/subtareas')
      expect(getSubtareas).toHaveBeenCalledWith({
        search: '',
        page: 1,
        limit: 10,
      })
    })

    it('debería aplicar filtros al cargar subtareas', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          search: 'test',
          estado: EstadoSubtarea.pendiente,
          prioridad: PrioridadSubtarea.alta,
          tareaId: 'tarea-1',
        })
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // ✅ Assert
      const { getSubtareas } = require('@/lib/services/subtareas')
      expect(getSubtareas).toHaveBeenCalledWith({
        search: 'test',
        estado: EstadoSubtarea.pendiente,
        prioridad: PrioridadSubtarea.alta,
        tareaId: 'tarea-1',
        page: 1,
        limit: 10,
      })
    })

    it('debería manejar errores al cargar subtareas', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        success: false,
        message: 'Error al cargar subtareas',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // ✅ Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Error al cargar subtareas')
        expect(result.current.loading).toBe(false)
        expect(result.current.subtareas).toEqual([])
      })

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error al cargar subtareas')
    })

    it('debería mostrar estado de carga', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      getSubtareas.mockReturnValue(promise)

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      act(() => {
        result.current.fetchSubtareas()
      })

      // ✅ Assert - Estado de carga
      expect(result.current.loading).toBe(true)

      // Resolver la promesa
      await act(async () => {
        resolvePromise({ success: true, data: mockSubtareas })
        await promise
      })

      // ✅ Assert - Estado final
      expect(result.current.loading).toBe(false)
    })
  })

  describe('fetchSubtareaById', () => {
    it('debería obtener una subtarea por ID', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockResolvedValue({ success: true, data: mockSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let subtarea: Subtarea | null = null
      await act(async () => {
        subtarea = await result.current.fetchSubtareaById('1')
      })

      // ✅ Assert
      expect(subtarea).toEqual(mockSubtarea)
      expect(getSubtareaById).toHaveBeenCalledWith('1')
    })

    it('debería manejar errores al obtener subtarea por ID', async () => {
      // 📋 Arrange
      const { getSubtareaById } = require('@/lib/services/subtareas')
      getSubtareaById.mockResolvedValue({
        success: false,
        message: 'Subtarea no encontrada',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let subtarea: Subtarea | null = null
      await act(async () => {
        subtarea = await result.current.fetchSubtareaById('999')
      })

      // ✅ Assert
      expect(subtarea).toBeNull()
      expect(result.current.error).toBe('Subtarea no encontrada')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Subtarea no encontrada')
    })
  })

  describe('createSubtarea', () => {
    const newSubtareaData: CreateSubtareaPayload = {
      titulo: 'Nueva Subtarea',
      descripcion: 'Descripción de la nueva subtarea',
      estado: EstadoSubtarea.pendiente,
      prioridad: PrioridadSubtarea.media,
      fechaInicio: new Date('2024-02-01'),
      fechaFin: new Date('2024-02-15'),
      tareaId: 'tarea-1',
      responsableId: 'user-1',
    }

    it('debería crear una nueva subtarea exitosamente', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      const newSubtarea = { ...mockSubtarea, ...newSubtareaData, id: '2', orden: 2 }
      createSubtarea.mockResolvedValue({ success: true, data: newSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let createdSubtarea: Subtarea | null = null
      await act(async () => {
        createdSubtarea = await result.current.createSubtarea(newSubtareaData)
      })

      // ✅ Assert
      expect(createdSubtarea).toEqual(newSubtarea)
      expect(createSubtarea).toHaveBeenCalledWith(newSubtareaData)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Subtarea creada exitosamente')
    })

    it('debería manejar errores al crear subtarea', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      createSubtarea.mockResolvedValue({
        success: false,
        message: 'Error de validación',
        errors: ['El título es requerido'],
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let createdSubtarea: Subtarea | null = null
      await act(async () => {
        createdSubtarea = await result.current.createSubtarea(newSubtareaData)
      })

      // ✅ Assert
      expect(createdSubtarea).toBeNull()
      expect(result.current.error).toBe('Error de validación')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error de validación')
    })

    it('debería actualizar la lista de subtareas después de crear', async () => {
      // 📋 Arrange
      const { createSubtarea, getSubtareas } = require('@/lib/services/subtareas')
      const newSubtarea = { ...mockSubtarea, ...newSubtareaData, id: '2', orden: 2 }
      createSubtarea.mockResolvedValue({ success: true, data: newSubtarea })
      getSubtareas.mockResolvedValue({ success: true, data: [...mockSubtareas, newSubtarea] })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      await act(async () => {
        await result.current.createSubtarea(newSubtareaData)
      })

      // ✅ Assert
      expect(result.current.subtareas).toHaveLength(2)
      expect(result.current.subtareas[1]).toEqual(newSubtarea)
    })
  })

  describe('updateSubtarea', () => {
    const updateData: UpdateSubtareaPayload = {
      titulo: 'Subtarea Actualizada',
      progreso: 75,
      estado: EstadoSubtarea.en_progreso,
    }

    it('debería actualizar una subtarea exitosamente', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      const updatedSubtarea = { ...mockSubtarea, ...updateData }
      updateSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      let updated: Subtarea | null = null
      await act(async () => {
        updated = await result.current.updateSubtarea('1', updateData)
      })

      // ✅ Assert
      expect(updated).toEqual(updatedSubtarea)
      expect(updateSubtarea).toHaveBeenCalledWith('1', updateData)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Subtarea actualizada exitosamente')
    })

    it('debería actualizar la subtarea en la lista local', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      const updatedSubtarea = { ...mockSubtarea, ...updateData }
      updateSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      await act(async () => {
        await result.current.updateSubtarea('1', updateData)
      })

      // ✅ Assert
      expect(result.current.subtareas[0].titulo).toBe('Subtarea Actualizada')
      expect(result.current.subtareas[0].progreso).toBe(75)
      expect(result.current.subtareas[0].estado).toBe(EstadoSubtarea.en_progreso)
    })

    it('debería manejar errores al actualizar subtarea', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      updateSubtarea.mockResolvedValue({
        success: false,
        message: 'Subtarea no encontrada',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let updated: Subtarea | null = null
      await act(async () => {
        updated = await result.current.updateSubtarea('999', updateData)
      })

      // ✅ Assert
      expect(updated).toBeNull()
      expect(result.current.error).toBe('Subtarea no encontrada')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Subtarea no encontrada')
    })
  })

  describe('deleteSubtarea', () => {
    it('debería eliminar una subtarea exitosamente', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      let deleted = false
      await act(async () => {
        deleted = await result.current.deleteSubtarea('1')
      })

      // ✅ Assert
      expect(deleted).toBe(true)
      expect(deleteSubtarea).toHaveBeenCalledWith('1')
      expect(result.current.subtareas).toHaveLength(0)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Subtarea eliminada exitosamente')
    })

    it('debería manejar errores al eliminar subtarea', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({
        success: false,
        message: 'No se puede eliminar la subtarea porque tiene dependencias',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let deleted = false
      await act(async () => {
        deleted = await result.current.deleteSubtarea('1')
      })

      // ✅ Assert
      expect(deleted).toBe(false)
      expect(result.current.error).toBe('No se puede eliminar la subtarea porque tiene dependencias')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('No se puede eliminar la subtarea porque tiene dependencias')
    })
  })

  describe('reorderSubtareas', () => {
    it('debería reordenar subtareas exitosamente', async () => {
      // 📋 Arrange
      const { reorderSubtareas } = require('@/lib/services/subtareas')
      const reorderedSubtareas = [{ ...mockSubtarea, orden: 2 }]
      reorderSubtareas.mockResolvedValue({ success: true, data: reorderedSubtareas })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      let reordered = false
      await act(async () => {
        reordered = await result.current.reorderSubtareas('tarea-1', [{ id: '1', orden: 2 }])
      })

      // ✅ Assert
      expect(reordered).toBe(true)
      expect(reorderSubtareas).toHaveBeenCalledWith('tarea-1', [{ id: '1', orden: 2 }])
      expect(result.current.subtareas[0].orden).toBe(2)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Orden actualizado exitosamente')
    })

    it('debería manejar errores al reordenar subtareas', async () => {
      // 📋 Arrange
      const { reorderSubtareas } = require('@/lib/services/subtareas')
      reorderSubtareas.mockResolvedValue({
        success: false,
        message: 'Error al reordenar subtareas',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let reordered = false
      await act(async () => {
        reordered = await result.current.reorderSubtareas('tarea-1', [{ id: '1', orden: 2 }])
      })

      // ✅ Assert
      expect(reordered).toBe(false)
      expect(result.current.error).toBe('Error al reordenar subtareas')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error al reordenar subtareas')
    })
  })

  describe('duplicateSubtarea', () => {
    it('debería duplicar una subtarea exitosamente', async () => {
      // 📋 Arrange
      const { duplicateSubtarea } = require('@/lib/services/subtareas')
      const duplicatedSubtarea = {
        ...mockSubtarea,
        id: '2',
        titulo: 'Subtarea Test (Copia)',
        orden: 2,
      }
      duplicateSubtarea.mockResolvedValue({ success: true, data: duplicatedSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      let duplicated: Subtarea | null = null
      await act(async () => {
        duplicated = await result.current.duplicateSubtarea('1')
      })

      // ✅ Assert
      expect(duplicated).toEqual(duplicatedSubtarea)
      expect(duplicateSubtarea).toHaveBeenCalledWith('1')

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Subtarea duplicada exitosamente')
    })

    it('debería manejar errores al duplicar subtarea', async () => {
      // 📋 Arrange
      const { duplicateSubtarea } = require('@/lib/services/subtareas')
      duplicateSubtarea.mockResolvedValue({
        success: false,
        message: 'Error al duplicar subtarea',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let duplicated: Subtarea | null = null
      await act(async () => {
        duplicated = await result.current.duplicateSubtarea('1')
      })

      // ✅ Assert
      expect(duplicated).toBeNull()
      expect(result.current.error).toBe('Error al duplicar subtarea')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error al duplicar subtarea')
    })
  })

  describe('updateProgreso', () => {
    it('debería actualizar el progreso de una subtarea', async () => {
      // 📋 Arrange
      const { updateProgresoSubtarea } = require('@/lib/services/subtareas')
      const updatedSubtarea = { ...mockSubtarea, progreso: 80 }
      updateProgresoSubtarea.mockResolvedValue({ success: true, data: updatedSubtarea })

      const { result } = renderHook(() => useSubtareas())

      // Cargar subtareas iniciales
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // 🎯 Act
      let updated = false
      await act(async () => {
        updated = await result.current.updateProgreso('1', 80)
      })

      // ✅ Assert
      expect(updated).toBe(true)
      expect(updateProgresoSubtarea).toHaveBeenCalledWith('1', 80)
      expect(result.current.subtareas[0].progreso).toBe(80)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Progreso actualizado')
    })

    it('debería manejar errores al actualizar progreso', async () => {
      // 📋 Arrange
      const { updateProgresoSubtarea } = require('@/lib/services/subtareas')
      updateProgresoSubtarea.mockResolvedValue({
        success: false,
        message: 'Progreso inválido',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      let updated = false
      await act(async () => {
        updated = await result.current.updateProgreso('1', 150)
      })

      // ✅ Assert
      expect(updated).toBe(false)
      expect(result.current.error).toBe('Progreso inválido')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Progreso inválido')
    })
  })

  describe('fetchMetricas', () => {
    it('debería cargar métricas exitosamente', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchMetricas()
      })

      // ✅ Assert
      expect(result.current.metricas).toEqual(mockMetricas)

      const { getMetricasSubtareas } = require('@/lib/services/subtareas')
      expect(getMetricasSubtareas).toHaveBeenCalledWith({})
    })

    it('debería aplicar filtros al cargar métricas', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          tareaId: 'tarea-1',
          estado: EstadoSubtarea.en_progreso,
        })
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchMetricas()
      })

      // ✅ Assert
      const { getMetricasSubtareas } = require('@/lib/services/subtareas')
      expect(getMetricasSubtareas).toHaveBeenCalledWith({
        tareaId: 'tarea-1',
        estado: EstadoSubtarea.en_progreso,
      })
    })

    it('debería manejar errores al cargar métricas', async () => {
      // 📋 Arrange
      const { getMetricasSubtareas } = require('@/lib/services/subtareas')
      getMetricasSubtareas.mockResolvedValue({
        success: false,
        message: 'Error al cargar métricas',
      })

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchMetricas()
      })

      // ✅ Assert
      expect(result.current.metricas).toBeNull()
      expect(result.current.error).toBe('Error al cargar métricas')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error al cargar métricas')
    })
  })

  describe('Filtros y paginación', () => {
    it('debería actualizar filtros correctamente', () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())
      const newFilters = {
        search: 'test',
        estado: EstadoSubtarea.completada,
        prioridad: PrioridadSubtarea.alta,
        tareaId: 'tarea-1',
      }

      // 🎯 Act
      act(() => {
        result.current.setFilters(newFilters)
      })

      // ✅ Assert
      expect(result.current.filters).toEqual({
        ...result.current.filters,
        ...newFilters,
      })
    })

    it('debería resetear filtros correctamente', () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          search: 'test',
          estado: EstadoSubtarea.completada,
          tareaId: 'tarea-1',
        })
      })

      // 🎯 Act
      act(() => {
        result.current.resetFilters()
      })

      // ✅ Assert
      expect(result.current.filters).toEqual({
        search: '',
        estado: undefined,
        prioridad: undefined,
        tareaId: undefined,
        responsableId: undefined,
      })
    })

    it('debería actualizar paginación correctamente', () => {
      // 📋 Arrange
      const { result } = renderHook(() => useSubtareas())
      const newPagination = {
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      }

      // 🎯 Act
      act(() => {
        result.current.setPagination(newPagination)
      })

      // ✅ Assert
      expect(result.current.pagination).toEqual(newPagination)
    })
  })

  describe('Manejo de errores', () => {
    it('debería limpiar errores al realizar operaciones exitosas', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      
      // Primero simular un error
      getSubtareas.mockResolvedValueOnce({
        success: false,
        message: 'Error temporal',
      })
      
      const { result } = renderHook(() => useSubtareas())

      // Generar error
      await act(async () => {
        await result.current.fetchSubtareas()
      })
      expect(result.current.error).toBe('Error temporal')

      // Simular operación exitosa
      getSubtareas.mockResolvedValueOnce({
        success: true,
        data: mockSubtareas,
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // ✅ Assert
      expect(result.current.error).toBeNull()
      expect(result.current.subtareas).toEqual(mockSubtareas)
    })

    it('debería manejar errores de red', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSubtareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchSubtareas()
      })

      // ✅ Assert
      expect(result.current.error).toBe('Error de conexión')
      expect(result.current.loading).toBe(false)

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error de conexión')
    })
  })
})