// ===================================================
// 📁 Archivo: dependencias.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de dependencias
// 🧠 Uso: Testing de servicios de dependencias entre tareas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getDependencias,
  getDependenciaById,
  createDependencia,
  deleteDependencia,
  getDependenciasByTarea,
  getDependenciasByProyecto,
  verificarDependenciaCircular,
  createDependenciaSegura,
  getRutaCritica,
  getTareasPredecesoras,
  getTareasSuccesoras,
  eliminarDependenciasDeTarea,
  validarDependenciasParaCambioEstado,
  getEstadisticasDependencias
} from '@/lib/services/dependencias'
import type {
  DependenciaTarea
} from '@/types/modelos'
import type {
  DependenciaTareaPayload,
  PaginatedResponse
} from '@/types/payloads'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockDependencia: DependenciaTarea = {
  id: '1',
  tareaOrigenId: 'tarea-1',
  tareaDestinoId: 'tarea-2',
  tipo: 'fin_a_inicio',
  retrasoMinimo: 0,
  proyectoServicioId: 'proyecto-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockDependenciaPayload: DependenciaTareaPayload = {
  tareaOrigenId: 'tarea-1',
  tareaDestinoId: 'tarea-2',
  tipo: 'fin_a_inicio',
  retrasoMinimo: 0
}

const mockPaginatedResponse: PaginatedResponse<DependenciaTarea> = {
  data: [mockDependencia],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1
}

describe('Dependencias Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getDependencias', () => {
    it('should get dependencias with default params', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await getDependencias()

      expect(fetch).toHaveBeenCalledWith('/api/dependencias', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })
      expect(result).toEqual(mockPaginatedResponse)
    })

    it('should get dependencias with query params', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const params = {
        page: 1,
        limit: 10,
        proyectoServicioId: 'proyecto-1',
        tipo: 'fin_inicio'
      }

      const result = await getDependencias(params)

      expect(fetch).toHaveBeenCalledWith(
        '/api/dependencias?page=1&limit=10&proyectoServicioId=proyecto-1&tipo=fin_inicio',
        expect.any(Object)
      )
      expect(result).toEqual(mockPaginatedResponse)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      } as Response)

      await expect(getDependencias()).rejects.toThrow('Server error')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('getDependenciaById', () => {
    it('should get dependencia by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencia
      } as Response)

      const result = await getDependenciaById('1')

      expect(fetch).toHaveBeenCalledWith('/api/dependencias/1', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })
      expect(result).toEqual(mockDependencia)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Dependencia no encontrada' })
      } as Response)

      await expect(getDependenciaById('1')).rejects.toThrow('Dependencia no encontrada')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('createDependencia', () => {
    it('should create dependencia successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencia
      } as Response)

      const result = await createDependencia(mockDependenciaPayload)

      expect(fetch).toHaveBeenCalledWith('/api/dependencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockDependenciaPayload)
      })
      expect(result).toEqual(mockDependencia)
    })

    it('should validate required fields', async () => {
      const invalidPayload = { ...mockDependenciaPayload, tareaOrigenId: '' }

      await expect(createDependencia(invalidPayload)).rejects.toThrow('La tarea origen es requerida')
    })

    it('should prevent self-dependency', async () => {
      const selfDependencyPayload = {
        ...mockDependenciaPayload,
        tareaOrigenId: 'tarea-1',
        tareaDestinoId: 'tarea-1'
      }

      await expect(createDependencia(selfDependencyPayload)).rejects.toThrow('Una tarea no puede depender de sí misma')
    })

    it('should validate negative delay', async () => {
      const negativeDelayPayload = { ...mockDependenciaPayload, retrasoHoras: -5 }

      await expect(createDependencia(negativeDelayPayload)).rejects.toThrow('El retraso no puede ser negativo')
    })
  })

  describe('deleteDependencia', () => {
    it('should delete dependencia successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true
      } as Response)

      await deleteDependencia('1')

      expect(fetch).toHaveBeenCalledWith('/api/dependencias/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
    })

    it('should throw error when delete fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Dependencia no encontrada' })
      } as Response)

      await expect(deleteDependencia('1')).rejects.toThrow('Dependencia no encontrada')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('getDependenciasByTarea', () => {
    it('should get dependencies by task', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse
        } as Response)

      const result = await getDependenciasByTarea('tarea-1')

      expect(result).toEqual({
        dependenciasOrigen: [mockDependencia],
        dependenciasDestino: [mockDependencia]
      })
    })
  })

  describe('getDependenciasByProyecto', () => {
    it('should get dependencies by project', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await getDependenciasByProyecto('proyecto-1')

      expect(result).toEqual([mockDependencia])
    })
  })

  describe('verificarDependenciaCircular', () => {
    it('should detect no circular dependency', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await verificarDependenciaCircular('tarea-1', 'tarea-3', 'proyecto-1')

      expect(result).toBe(false)
    })

    it('should detect circular dependency', async () => {
      const circularDependencies = {
        data: [
          { ...mockDependencia, tareaOrigenId: 'tarea-1', tareaDestinoId: 'tarea-2' },
          { ...mockDependencia, id: '2', tareaOrigenId: 'tarea-2', tareaDestinoId: 'tarea-3' }
        ],
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => circularDependencies
      } as Response)

      const result = await verificarDependenciaCircular('tarea-3', 'tarea-1', 'proyecto-1')

      expect(result).toBe(true)
    })
  })

  describe('createDependenciaSegura', () => {
    it('should create safe dependency', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDependencia
        } as Response)

      const result = await createDependenciaSegura(mockDependenciaPayload, 'proyecto-1')

      expect(result).toEqual(mockDependencia)
    })

    it('should prevent circular dependency creation', async () => {
      const circularDependencies = {
        data: [
          { ...mockDependencia, tareaOrigenId: 'tarea-2', tareaDestinoId: 'tarea-1' }
        ],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => circularDependencies
      } as Response)

      await expect(createDependenciaSegura(mockDependenciaPayload, 'proyecto-1'))
        .rejects.toThrow('No se puede crear la dependencia: generaría una dependencia circular')
    })
  })

  describe('getRutaCritica', () => {
    it('should get critical path', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await getRutaCritica('proyecto-1')

      expect(result).toEqual({
        rutaCritica: expect.any(Array),
        duracionTotal: 0
      })
    })
  })

  describe('getTareasPredecesoras', () => {
    it('should get predecessor tasks', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await getTareasPredecesoras('tarea-2')

      expect(result).toEqual([mockDependencia])
    })
  })

  describe('getTareasSuccesoras', () => {
    it('should get successor tasks', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await getTareasSuccesoras('tarea-1')

      expect(result).toEqual([mockDependencia])
    })
  })

  describe('eliminarDependenciasDeTarea', () => {
    it('should delete all task dependencies', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)

      await eliminarDependenciasDeTarea('tarea-1')

      expect(fetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('validarDependenciasParaCambioEstado', () => {
    it('should validate dependencies for status change', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      } as Response)

      const result = await validarDependenciasParaCambioEstado('tarea-1', 'completada')

      expect(result).toEqual({ valido: true })
    })

    it('should handle validation errors', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await validarDependenciasParaCambioEstado('tarea-1', 'completada')

      expect(result).toEqual({
        valido: false,
        mensaje: 'Error al validar dependencias'
      })
    })
  })

  describe('getEstadisticasDependencias', () => {
    it('should get dependency statistics', async () => {
      const multipleDependencies = {
        data: [
          mockDependencia,
          { ...mockDependencia, id: '2', tipo: 'inicio_inicio' }
        ],
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => multipleDependencies
      } as Response)

      const result = await getEstadisticasDependencias('proyecto-1')

      expect(result).toEqual({
        totalDependencias: 2,
        dependenciasPorTipo: {
          'fin_inicio': 1,
          'inicio_inicio': 1
        },
        tareasConMasDependencias: expect.any(Array)
      })
    })
  })
})