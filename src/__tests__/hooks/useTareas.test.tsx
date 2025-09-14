// ===================================================
// 📁 Archivo: useTareas.test.tsx
// 📌 Descripción: Tests unitarios para hook useTareas (CLIENT)
// 🧠 Uso: React Testing Library + Jest para hooks cliente
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { renderHook, act, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { useTareas } from '../useTareas'
import { EstadoTarea, PrioridadTarea } from '@prisma/client'
import type { Tarea, CreateTareaPayload, UpdateTareaPayload } from '@/types/modelos'

// 🔧 Mock de servicios
jest.mock('@/lib/services/tareas', () => ({
  getTareas: jest.fn(),
  getTareaById: jest.fn(),
  createTarea: jest.fn(),
  updateTarea: jest.fn(),
  deleteTarea: jest.fn(),
  updateProgresoTarea: jest.fn(),
  getMetricasTareas: jest.fn(),
}))

// 🔧 Mock de toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

const mockTarea: Tarea = {
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
  subtareas: [],
  _count: {
    subtareas: 0,
  },
}

const mockTareas = [mockTarea]

const mockMetricas = {
  total: 10,
  pendientes: 3,
  enProgreso: 4,
  completadas: 3,
  progresoPromedio: 65,
  horasEstimadas: 400,
  horasReales: 280,
  eficiencia: 70,
}

describe('useTareas Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de servicios por defecto
    const { getTareas, getMetricasTareas } = require('@/lib/services/tareas')
    getTareas.mockResolvedValue({ success: true, data: mockTareas })
    getMetricasTareas.mockResolvedValue({ success: true, data: mockMetricas })
  })

  describe('Estado inicial', () => {
    it('debería inicializar con valores por defecto', () => {
      // 🎯 Act
      const { result } = renderHook(() => useTareas())

      // ✅ Assert
      expect(result.current.tareas).toEqual([])
      expect(result.current.metricas).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.filters).toEqual({
        search: '',
        estado: undefined,
        prioridad: undefined,
        proyectoId: undefined,
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
      const { result } = renderHook(() => useTareas())

      // ✅ Assert
      expect(typeof result.current.fetchTareas).toBe('function')
      expect(typeof result.current.fetchTareaById).toBe('function')
      expect(typeof result.current.createTarea).toBe('function')
      expect(typeof result.current.updateTarea).toBe('function')
      expect(typeof result.current.deleteTarea).toBe('function')
      expect(typeof result.current.updateProgreso).toBe('function')
      expect(typeof result.current.fetchMetricas).toBe('function')
      expect(typeof result.current.setFilters).toBe('function')
      expect(typeof result.current.setPagination).toBe('function')
      expect(typeof result.current.resetFilters).toBe('function')
    })
  })

  describe('fetchTareas', () => {
    it('debería cargar tareas exitosamente', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchTareas()
      })

      // ✅ Assert
      await waitFor(() => {
        expect(result.current.tareas).toEqual(mockTareas)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
      })

      const { getTareas } = require('@/lib/services/tareas')
      expect(getTareas).toHaveBeenCalledWith({
        search: '',
        page: 1,
        limit: 10,
      })
    })

    it('debería aplicar filtros al cargar tareas', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useTareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          search: 'test',
          estado: EstadoTarea.pendiente,
          prioridad: PrioridadTarea.alta,
          proyectoId: 'proyecto-1',
        })
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchTareas()
      })

      // ✅ Assert
      const { getTareas } = require('@/lib/services/tareas')
      expect(getTareas).toHaveBeenCalledWith({
        search: 'test',
        estado: EstadoTarea.pendiente,
        prioridad: PrioridadTarea.alta,
        proyectoId: 'proyecto-1',
        page: 1,
        limit: 10,
      })
    })

    it('debería manejar errores al cargar tareas', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockResolvedValue({
        success: false,
        message: 'Error al cargar tareas',
      })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchTareas()
      })

      // ✅ Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Error al cargar tareas')
        expect(result.current.loading).toBe(false)
        expect(result.current.tareas).toEqual([])
      })

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error al cargar tareas')
    })

    it('debería mostrar estado de carga', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      getTareas.mockReturnValue(promise)

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      act(() => {
        result.current.fetchTareas()
      })

      // ✅ Assert - Estado de carga
      expect(result.current.loading).toBe(true)

      // Resolver la promesa
      await act(async () => {
        resolvePromise({ success: true, data: mockTareas })
        await promise
      })

      // ✅ Assert - Estado final
      expect(result.current.loading).toBe(false)
    })
  })

  describe('fetchTareaById', () => {
    it('debería obtener una tarea por ID', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockResolvedValue({ success: true, data: mockTarea })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let tarea: Tarea | null = null
      await act(async () => {
        tarea = await result.current.fetchTareaById('1')
      })

      // ✅ Assert
      expect(tarea).toEqual(mockTarea)
      expect(getTareaById).toHaveBeenCalledWith('1')
    })

    it('debería manejar errores al obtener tarea por ID', async () => {
      // 📋 Arrange
      const { getTareaById } = require('@/lib/services/tareas')
      getTareaById.mockResolvedValue({
        success: false,
        message: 'Tarea no encontrada',
      })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let tarea: Tarea | null = null
      await act(async () => {
        tarea = await result.current.fetchTareaById('999')
      })

      // ✅ Assert
      expect(tarea).toBeNull()
      expect(result.current.error).toBe('Tarea no encontrada')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Tarea no encontrada')
    })
  })

  describe('createTarea', () => {
    const newTareaData: CreateTareaPayload = {
      titulo: 'Nueva Tarea',
      descripcion: 'Descripción de la nueva tarea',
      estado: EstadoTarea.pendiente,
      prioridad: PrioridadTarea.media,
      fechaInicio: new Date('2024-02-01'),
      fechaFin: new Date('2024-02-15'),
      horasEstimadas: 20,
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
    }

    it('debería crear una nueva tarea exitosamente', async () => {
      // 📋 Arrange
      const { createTarea } = require('@/lib/services/tareas')
      const newTarea = { ...mockTarea, ...newTareaData, id: '2' }
      createTarea.mockResolvedValue({ success: true, data: newTarea })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let createdTarea: Tarea | null = null
      await act(async () => {
        createdTarea = await result.current.createTarea(newTareaData)
      })

      // ✅ Assert
      expect(createdTarea).toEqual(newTarea)
      expect(createTarea).toHaveBeenCalledWith(newTareaData)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Tarea creada exitosamente')
    })

    it('debería manejar errores al crear tarea', async () => {
      // 📋 Arrange
      const { createTarea } = require('@/lib/services/tareas')
      createTarea.mockResolvedValue({
        success: false,
        message: 'Error de validación',
        errors: ['El título es requerido'],
      })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let createdTarea: Tarea | null = null
      await act(async () => {
        createdTarea = await result.current.createTarea(newTareaData)
      })

      // ✅ Assert
      expect(createdTarea).toBeNull()
      expect(result.current.error).toBe('Error de validación')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error de validación')
    })

    it('debería actualizar la lista de tareas después de crear', async () => {
      // 📋 Arrange
      const { createTarea, getTareas } = require('@/lib/services/tareas')
      const newTarea = { ...mockTarea, ...newTareaData, id: '2' }
      createTarea.mockResolvedValue({ success: true, data: newTarea })
      getTareas.mockResolvedValue({ success: true, data: [...mockTareas, newTarea] })

      const { result } = renderHook(() => useTareas())

      // Cargar tareas iniciales
      await act(async () => {
        await result.current.fetchTareas()
      })

      // 🎯 Act
      await act(async () => {
        await result.current.createTarea(newTareaData)
      })

      // ✅ Assert
      expect(result.current.tareas).toHaveLength(2)
      expect(result.current.tareas[1]).toEqual(newTarea)
    })
  })

  describe('updateTarea', () => {
    const updateData: UpdateTareaPayload = {
      titulo: 'Tarea Actualizada',
      progreso: 75,
      estado: EstadoTarea.en_progreso,
    }

    it('debería actualizar una tarea exitosamente', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      const updatedTarea = { ...mockTarea, ...updateData }
      updateTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const { result } = renderHook(() => useTareas())

      // Cargar tareas iniciales
      await act(async () => {
        await result.current.fetchTareas()
      })

      // 🎯 Act
      let updated: Tarea | null = null
      await act(async () => {
        updated = await result.current.updateTarea('1', updateData)
      })

      // ✅ Assert
      expect(updated).toEqual(updatedTarea)
      expect(updateTarea).toHaveBeenCalledWith('1', updateData)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Tarea actualizada exitosamente')
    })

    it('debería actualizar la tarea en la lista local', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      const updatedTarea = { ...mockTarea, ...updateData }
      updateTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const { result } = renderHook(() => useTareas())

      // Cargar tareas iniciales
      await act(async () => {
        await result.current.fetchTareas()
      })

      // 🎯 Act
      await act(async () => {
        await result.current.updateTarea('1', updateData)
      })

      // ✅ Assert
      expect(result.current.tareas[0].titulo).toBe('Tarea Actualizada')
      expect(result.current.tareas[0].progreso).toBe(75)
      expect(result.current.tareas[0].estado).toBe(EstadoTarea.en_progreso)
    })

    it('debería manejar errores al actualizar tarea', async () => {
      // 📋 Arrange
      const { updateTarea } = require('@/lib/services/tareas')
      updateTarea.mockResolvedValue({
        success: false,
        message: 'Tarea no encontrada',
      })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let updated: Tarea | null = null
      await act(async () => {
        updated = await result.current.updateTarea('999', updateData)
      })

      // ✅ Assert
      expect(updated).toBeNull()
      expect(result.current.error).toBe('Tarea no encontrada')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Tarea no encontrada')
    })
  })

  describe('deleteTarea', () => {
    it('debería eliminar una tarea exitosamente', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useTareas())

      // Cargar tareas iniciales
      await act(async () => {
        await result.current.fetchTareas()
      })

      // 🎯 Act
      let deleted = false
      await act(async () => {
        deleted = await result.current.deleteTarea('1')
      })

      // ✅ Assert
      expect(deleted).toBe(true)
      expect(deleteTarea).toHaveBeenCalledWith('1')
      expect(result.current.tareas).toHaveLength(0)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Tarea eliminada exitosamente')
    })

    it('debería manejar errores al eliminar tarea', async () => {
      // 📋 Arrange
      const { deleteTarea } = require('@/lib/services/tareas')
      deleteTarea.mockResolvedValue({
        success: false,
        message: 'No se puede eliminar la tarea porque tiene subtareas',
      })

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      let deleted = false
      await act(async () => {
        deleted = await result.current.deleteTarea('1')
      })

      // ✅ Assert
      expect(deleted).toBe(false)
      expect(result.current.error).toBe('No se puede eliminar la tarea porque tiene subtareas')

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('No se puede eliminar la tarea porque tiene subtareas')
    })
  })

  describe('updateProgreso', () => {
    it('debería actualizar el progreso de una tarea', async () => {
      // 📋 Arrange
      const { updateProgresoTarea } = require('@/lib/services/tareas')
      const updatedTarea = { ...mockTarea, progreso: 80 }
      updateProgresoTarea.mockResolvedValue({ success: true, data: updatedTarea })

      const { result } = renderHook(() => useTareas())

      // Cargar tareas iniciales
      await act(async () => {
        await result.current.fetchTareas()
      })

      // 🎯 Act
      let updated = false
      await act(async () => {
        updated = await result.current.updateProgreso('1', 80)
      })

      // ✅ Assert
      expect(updated).toBe(true)
      expect(updateProgresoTarea).toHaveBeenCalledWith('1', 80)
      expect(result.current.tareas[0].progreso).toBe(80)

      const { toast } = require('react-hot-toast')
      expect(toast.success).toHaveBeenCalledWith('Progreso actualizado')
    })

    it('debería manejar errores al actualizar progreso', async () => {
      // 📋 Arrange
      const { updateProgresoTarea } = require('@/lib/services/tareas')
      updateProgresoTarea.mockResolvedValue({
        success: false,
        message: 'Progreso inválido',
      })

      const { result } = renderHook(() => useTareas())

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
      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchMetricas()
      })

      // ✅ Assert
      expect(result.current.metricas).toEqual(mockMetricas)

      const { getMetricasTareas } = require('@/lib/services/tareas')
      expect(getMetricasTareas).toHaveBeenCalledWith({})
    })

    it('debería aplicar filtros al cargar métricas', async () => {
      // 📋 Arrange
      const { result } = renderHook(() => useTareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          proyectoId: 'proyecto-1',
          estado: EstadoTarea.en_progreso,
        })
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchMetricas()
      })

      // ✅ Assert
      const { getMetricasTareas } = require('@/lib/services/tareas')
      expect(getMetricasTareas).toHaveBeenCalledWith({
        proyectoId: 'proyecto-1',
        estado: EstadoTarea.en_progreso,
      })
    })

    it('debería manejar errores al cargar métricas', async () => {
      // 📋 Arrange
      const { getMetricasTareas } = require('@/lib/services/tareas')
      getMetricasTareas.mockResolvedValue({
        success: false,
        message: 'Error al cargar métricas',
      })

      const { result } = renderHook(() => useTareas())

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
      const { result } = renderHook(() => useTareas())
      const newFilters = {
        search: 'test',
        estado: EstadoTarea.completada,
        prioridad: PrioridadTarea.alta,
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
      const { result } = renderHook(() => useTareas())

      // Establecer filtros
      act(() => {
        result.current.setFilters({
          search: 'test',
          estado: EstadoTarea.completada,
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
        proyectoId: undefined,
        responsableId: undefined,
      })
    })

    it('debería actualizar paginación correctamente', () => {
      // 📋 Arrange
      const { result } = renderHook(() => useTareas())
      const newPagination = {
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
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
      const { getTareas } = require('@/lib/services/tareas')
      
      // Primero simular un error
      getTareas.mockResolvedValueOnce({
        success: false,
        message: 'Error temporal',
      })
      
      const { result } = renderHook(() => useTareas())

      // Generar error
      await act(async () => {
        await result.current.fetchTareas()
      })
      expect(result.current.error).toBe('Error temporal')

      // Simular operación exitosa
      getTareas.mockResolvedValueOnce({
        success: true,
        data: mockTareas,
      })

      // 🎯 Act
      await act(async () => {
        await result.current.fetchTareas()
      })

      // ✅ Assert
      expect(result.current.error).toBeNull()
      expect(result.current.tareas).toEqual(mockTareas)
    })

    it('debería manejar errores de red', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTareas())

      // 🎯 Act
      await act(async () => {
        await result.current.fetchTareas()
      })

      // ✅ Assert
      expect(result.current.error).toBe('Error de conexión')
      expect(result.current.loading).toBe(false)

      const { toast } = require('react-hot-toast')
      expect(toast.error).toHaveBeenCalledWith('Error de conexión')
    })
  })
})