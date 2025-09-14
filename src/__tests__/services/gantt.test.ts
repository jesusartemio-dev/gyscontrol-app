// ===================================================
// 📁 Archivo: gantt.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de Gantt Chart
// 🧠 Uso: Testing de servicios de análisis Gantt
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getGanttData,
  calcularMetricasProyecto,
  generarTimeline,
  identificarRutaCritica,
  analizarCargaTrabajo,
  generarReporteProgreso,
  exportarDatosGantt
} from '@/lib/services/gantt'
import type {
  GanttChartPayload,
  GanttTaskPayload,
  GanttMetricsPayload
} from '@/types/payloads'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockGanttTask: GanttTaskPayload = {
  id: '1',
  nombre: 'Tarea de prueba',
  descripcion: 'Descripción de prueba',
  estado: 'en_progreso',
  prioridad: 'alta',
  progreso: 50,
  fechaInicio: '2024-01-01T00:00:00.000Z',
  fechaFin: '2024-01-15T00:00:00.000Z',
  horasEstimadas: 40,
  horasReales: 35,
  asignadoId: 'user-1',
  nombreAsignado: 'Usuario Test',
  proyectoServicioId: 'proyecto-1'
}

const mockGanttData: GanttChartPayload = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  tareas: [mockGanttTask],
  dependencias: [{
    id: 'dep-1',
    tareaOrigenId: '1',
    tareaDestinoId: '2',
    tipo: 'fin_inicio'
  }]
}

describe('Gantt Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getGanttData', () => {
    it('should get gantt data successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGanttData
      } as Response)

      const result = await getGanttData('proyecto-1')

      expect(fetch).toHaveBeenCalledWith('/api/gantt/proyecto-1', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })
      expect(result).toEqual(mockGanttData)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Proyecto no encontrado' })
      } as Response)

      await expect(getGanttData('proyecto-1')).rejects.toThrow('Proyecto no encontrado')
      expect(console.error).toHaveBeenCalled()
    })

    it('should throw error when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getGanttData('proyecto-1')).rejects.toThrow('Network error')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('calcularMetricasProyecto', () => {
    it('should calculate project metrics correctly', () => {
      const result = calcularMetricasProyecto(mockGanttData)

      expect(result).toEqual({
        totalTareas: 1,
        tareasCompletadas: 0,
        tareasEnProgreso: 1,
        tareasPendientes: 0,
        progresoGeneral: 50,
        horasEstimadas: 40,
        horasReales: 35,
        eficiencia: 114,
        diasRestantes: expect.any(Number),
        fechaEstimadaFinalizacion: '2024-01-15T00:00:00.000Z'
      })
    })

    it('should handle empty tasks array', () => {
      const emptyData = { ...mockGanttData, tareas: [] }
      const result = calcularMetricasProyecto(emptyData)

      expect(result).toEqual({
        totalTareas: 0,
        tareasCompletadas: 0,
        tareasEnProgreso: 0,
        tareasPendientes: 0,
        progresoGeneral: 0,
        horasEstimadas: 0,
        horasReales: 0,
        eficiencia: 0,
        diasRestantes: 0,
        fechaEstimadaFinalizacion: null
      })
    })

    it('should handle error in calculation', () => {
      const invalidData = null as any
      
      expect(() => calcularMetricasProyecto(invalidData)).toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('generarTimeline', () => {
    it('should generate timeline correctly', () => {
      const result = generarTimeline([mockGanttTask])

      expect(result).toEqual({
        fechaInicio: '2024-01-01T00:00:00.000Z',
        fechaFin: '2024-01-15T00:00:00.000Z',
        duracionDias: 14,
        hitos: expect.arrayContaining([
          expect.objectContaining({
            fecha: '2024-01-01T00:00:00.000Z',
            descripcion: 'Inicio del proyecto',
            tipo: 'inicio'
          }),
          expect.objectContaining({
            fecha: '2024-01-15T00:00:00.000Z',
            descripcion: 'Fin estimado del proyecto',
            tipo: 'fin'
          })
        ])
      })
    })

    it('should handle empty tasks array', () => {
      const result = generarTimeline([])

      expect(result).toEqual({
        fechaInicio: expect.any(String),
        fechaFin: expect.any(String),
        duracionDias: 0,
        hitos: []
      })
    })

    it('should handle error in timeline generation', () => {
      const invalidTasks = null as any
      
      expect(() => generarTimeline(invalidTasks)).toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('identificarRutaCritica', () => {
    it('should identify critical path correctly', () => {
      const result = identificarRutaCritica(mockGanttData)

      expect(result).toEqual({
        rutaCritica: expect.any(Array),
        tareasRutaCritica: expect.any(Array),
        duracionRutaCritica: expect.any(Number)
      })
    })

    it('should handle empty tasks', () => {
      const emptyData = { ...mockGanttData, tareas: [] }
      const result = identificarRutaCritica(emptyData)

      expect(result).toEqual({
        rutaCritica: [],
        tareasRutaCritica: [],
        duracionRutaCritica: 0
      })
    })

    it('should handle error in critical path calculation', () => {
      const invalidData = null as any
      const result = identificarRutaCritica(invalidData)

      expect(result).toEqual({
        rutaCritica: [],
        tareasRutaCritica: [],
        duracionRutaCritica: 0
      })
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('analizarCargaTrabajo', () => {
    it('should analyze workload correctly', () => {
      const result = analizarCargaTrabajo(mockGanttData)

      expect(result).toEqual({
        cargaPorAsignado: {
          'user-1': {
            nombreAsignado: 'Usuario Test',
            totalTareas: 1,
            horasEstimadas: 40,
            horasReales: 35,
            progreso: 50,
            eficiencia: 114
          }
        },
        asignadosSobrecargados: []
      })
    })

    it('should handle tasks without assigned users', () => {
      const taskWithoutAssigned = { ...mockGanttTask, asignadoId: null, nombreAsignado: null }
      const dataWithoutAssigned = { ...mockGanttData, tareas: [taskWithoutAssigned] }
      
      const result = analizarCargaTrabajo(dataWithoutAssigned)

      expect(result).toEqual({
        cargaPorAsignado: {},
        asignadosSobrecargados: []
      })
    })

    it('should handle error in workload analysis', () => {
      const invalidData = null as any
      const result = analizarCargaTrabajo(invalidData)

      expect(result).toEqual({
        cargaPorAsignado: {},
        asignadosSobrecargados: []
      })
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('generarReporteProgreso', () => {
    it('should generate progress report successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGanttData
      } as Response)

      const result = await generarReporteProgreso('proyecto-1')

      expect(result).toEqual({
        ganttData: mockGanttData,
        metricas: expect.any(Object),
        timeline: expect.any(Object),
        rutaCritica: expect.any(Object),
        cargaTrabajo: expect.any(Object)
      })
    })

    it('should throw error when gantt data fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(generarReporteProgreso('proyecto-1')).rejects.toThrow('Network error')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('exportarDatosGantt', () => {
    it('should export data as JSON', () => {
      const result = exportarDatosGantt(mockGanttData, 'json')
      const parsed = JSON.parse(result)

      expect(parsed).toEqual(mockGanttData)
    })

    it('should export data as CSV', () => {
      const result = exportarDatosGantt(mockGanttData, 'csv')

      expect(result).toContain('ID,Nombre,Estado,Prioridad,Progreso')
      expect(result).toContain('1,"Tarea de prueba",en_progreso,alta,50')
    })

    it('should throw error for unsupported format', () => {
      expect(() => exportarDatosGantt(mockGanttData, 'xml' as any)).toThrow('Formato no soportado: xml')
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle error in export', () => {
      const circularData = {} as any
      circularData.self = circularData
      
      expect(() => exportarDatosGantt(circularData, 'json')).toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })
})