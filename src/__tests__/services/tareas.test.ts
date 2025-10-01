/**
 * 🧪 Tests para el servicio de Tareas
 * 
 * Cobertura:
 * - ✅ getTareas (con y sin filtros)
 * - ✅ getTareaById (exitoso y error)
 * - ✅ createTarea (exitoso y error)
 * - ✅ updateTarea (exitoso y error)
 * - ✅ deleteTarea (exitoso y error)
 * - ✅ cambiarEstadoTarea (exitoso)
 * - ✅ getTareasByProyectoServicio
 */

import * as tareasService from '../../lib/services/tareas'
import type { Tarea, TareaPayload, TareaUpdatePayload } from '../../types/modelos'

// 🎭 Mock de fetch global
const mockFetch = jest.fn()
global.fetch = mockFetch

// 🔇 Silenciar console.error durante los tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

// 🎯 Mock data con tipos correctos
const mockTarea: Tarea = {
  id: '1',
  nombre: 'Tarea de prueba', // ✅ Usar 'nombre' no 'titulo'
  descripcion: 'Descripción de prueba',
  estado: 'pendiente',
  prioridad: 'media',
  progreso: 0,
  horasEstimadas: 8,
  horasReales: 0,
  createdAt: '2025-01-15T00:00:00.000Z', // ✅ String no Date
  updatedAt: '2025-01-15T00:00:00.000Z',
  fechaInicio: '2025-01-15T00:00:00.000Z',
  fechaFin: '2025-01-20T00:00:00.000Z',
  proyectoServicioId: 'proyecto-1',
  responsableId: 'user-1',
  // Relaciones opcionales para tests
  proyectoServicio: {} as any,
  responsable: {} as any,
  subtareas: [],
  dependenciasOrigen: [],
  dependenciasDestino: [],
  asignaciones: [],
  registrosProgreso: []
}

const mockTareaPayload: TareaPayload = {
  nombre: 'Nueva tarea', // ✅ Usar 'nombre' no 'titulo'
  descripcion: 'Nueva descripción',
  estado: 'pendiente',
  prioridad: 'alta',
  fechaInicio: '2025-01-15T00:00:00.000Z', // ✅ String no Date
  fechaFin: '2025-01-20T00:00:00.000Z',
  horasEstimadas: 10,
  proyectoServicioId: 'proyecto-1',
  responsableId: 'user-1'
}

describe('Servicio de Tareas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTareas', () => {
    it('debería obtener lista de tareas exitosamente', async () => {
      // 🎯 Arrange
      const mockResponse = {
        data: [mockTarea],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      // 🎯 Act
      const resultado = await tareasService.getTareas()

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith('/api/tareas', expect.objectContaining({
        method: 'GET',
        cache: 'no-store'
      }))
      expect(resultado).toEqual(mockResponse)
    })

    it('debería manejar parámetros de filtrado', async () => {
      // 🎯 Arrange
      const params = {
        estado: 'pendiente' as const,
        prioridad: 'alta' as const,
        page: 2,
        limit: 5
      }
      const mockResponse = {
        data: [mockTarea],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      // 🎯 Act
      const resultado = await tareasService.getTareas(params)

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('estado=pendiente'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(resultado).toEqual(mockResponse)
    })

    it('debería manejar error al obtener tareas', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: async () => ({ error: 'Error interno del servidor' })
      })

      // 🎯 Act & Assert
      await expect(tareasService.getTareas()).rejects.toThrow('Error interno del servidor')
    })
  })

  describe('getTareaById', () => {
    it('debería obtener tarea por ID exitosamente', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTarea
      })

      // 🎯 Act
      const resultado = await tareasService.getTareaById('1')

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith('/api/tareas/1', expect.objectContaining({
        method: 'GET'
      }))
      expect(resultado).toEqual(mockTarea)
    })

    it('debería manejar tarea no encontrada', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Error',
        json: async () => ({ error: 'Tarea no encontrada' })
      })

      // 🎯 Act & Assert
      await expect(tareasService.getTareaById('999')).rejects.toThrow('Tarea no encontrada')
    })
  })

  describe('createTarea', () => {
    it('debería crear tarea exitosamente', async () => {
      // 🎯 Arrange
      const nuevaTarea = { ...mockTarea, ...mockTareaPayload }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => nuevaTarea
      })

      // 🎯 Act
      const resultado = await tareasService.createTarea(mockTareaPayload)

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith('/api/tareas', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockTareaPayload)
      }))
      expect(resultado).toEqual(nuevaTarea)
    })

    it('debería manejar error de validación al crear', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Error',
        json: async () => ({ error: 'El nombre de la tarea es requerido' })
      })

      // 🎯 Act & Assert
      await expect(tareasService.createTarea(mockTareaPayload)).rejects.toThrow('El nombre de la tarea es requerido')
    })
  })

  describe('updateTarea', () => {
    it('debería actualizar tarea exitosamente', async () => {
      // 🎯 Arrange
      const updatePayload: TareaUpdatePayload = { nombre: 'Nombre actualizado' } // ✅ Usar 'nombre'
      const tareaActualizada = { ...mockTarea, ...updatePayload }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => tareaActualizada
      })

      // 🎯 Act
      const resultado = await tareasService.updateTarea('1', updatePayload)

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith('/api/tareas/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      }))
      expect(resultado).toEqual(tareaActualizada)
    })

    it('debería manejar tarea no encontrada en actualización', async () => {
      // 🎯 Arrange
      const updatePayload: TareaUpdatePayload = { nombre: 'Nombre actualizado' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Error',
        json: async () => ({ error: 'Tarea no encontrada' })
      })

      // 🎯 Act & Assert
      await expect(tareasService.updateTarea('999', updatePayload)).rejects.toThrow('Tarea no encontrada')
    })
  })

  describe('deleteTarea', () => {
    it('debería eliminar tarea exitosamente', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      })

      // 🎯 Act
      await tareasService.deleteTarea('1')

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith('/api/tareas/1', expect.objectContaining({
        method: 'DELETE'
      }))
    })

    it('debería manejar error al eliminar tarea no existente', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Error',
        json: async () => ({ error: 'Tarea no encontrada' })
      })

      // 🎯 Act & Assert
      await expect(tareasService.deleteTarea('999')).rejects.toThrow('Tarea no encontrada')
    })
  })

  describe('getTareasByProyectoServicio', () => {
    it('debería obtener tareas por proyecto/servicio', async () => {
      // 🎯 Arrange
      const mockResponse = {
        data: [mockTarea],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      // 🎯 Act
      const resultado = await tareasService.getTareasByProyectoServicio('proyecto-1')

      // ✅ Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('proyectoServicioId=proyecto-1'),
        expect.objectContaining({ method: 'GET' })
      )
      // ✅ La función devuelve solo el array de datos, no la respuesta completa
      expect(resultado).toEqual([mockTarea])
    })
  })

  describe('cambiarEstadoTarea', () => {
    it('debería cambiar estado de tarea exitosamente', async () => {
      // 🎯 Arrange
      const tareaConNuevoEstado = { ...mockTarea, estado: 'en_progreso' as const }
      
      // Primera llamada: getTareaById
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTarea
      })
      
      // Segunda llamada: updateTarea
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => tareaConNuevoEstado
      })

      // 🎯 Act
      const resultado = await tareasService.cambiarEstadoTarea('1', 'en_progreso')

      // ✅ Assert
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(resultado).toEqual(tareaConNuevoEstado)
    })

    it('debería validar transiciones de estado inválidas', async () => {
      // 🎯 Arrange - Tarea completada no puede cambiar a pendiente
      const tareaCompletada = { ...mockTarea, estado: 'completada' as const }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => tareaCompletada
      })

      // 🎯 Act & Assert
      await expect(tareasService.cambiarEstadoTarea('1', 'pendiente')).rejects.toThrow("No se puede cambiar de 'completada' a 'pendiente'")
    })
  })
})
