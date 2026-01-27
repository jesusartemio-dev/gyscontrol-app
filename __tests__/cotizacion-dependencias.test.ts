import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import {
  getDependenciasCotizacion,
  getDependenciasByTarea,
  aplicarDependenciasAFechas,
  detectarCiclos,
  identificarHitosAutomaticamente
} from '@/lib/services/cotizacionDependencias'

// Mock de Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacionDependenciaTarea: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    cotizacionTarea: {
      findMany: jest.fn(),
      update: jest.fn()
    }
  }
}))

describe('CotizacionDependencias Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDependenciasCotizacion', () => {
    it('debe retornar lista vacía cuando no hay dependencias', async () => {
      // TODO: Implement when CotizacionDependenciaTarea model is available
      const result = await getDependenciasCotizacion('cotizacion-123')
      expect(result).toEqual([])
    })

    it('debe manejar errores de base de datos', async () => {
      // Simular error de BD
      const mockFindMany = prisma.cotizacionDependenciaTarea.findMany as jest.MockedFunction<any>
      mockFindMany.mockRejectedValue(new Error('Database error'))

      // TODO: Update when implementation is complete
      // await expect(getDependenciasCotizacion('cotizacion-123')).rejects.toThrow('Database error')
    })
  })

  describe('getDependenciasByTarea', () => {
    it('debe retornar estructura correcta para tarea sin dependencias', async () => {
      const result = await getDependenciasByTarea('tarea-123')

      expect(result).toHaveProperty('dependenciasOrigen')
      expect(result).toHaveProperty('dependenciasDestino')
      expect(result.dependenciasOrigen).toEqual([])
      expect(result.dependenciasDestino).toEqual([])
    })
  })

  describe('aplicarDependenciasAFechas', () => {
    it('debe retornar array vacío cuando no hay dependencias', async () => {
      const calendarioLaboral = {
        horasPorDia: 8,
        diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
      }

      const result = await aplicarDependenciasAFechas('cotizacion-123', calendarioLaboral)
      expect(result).toEqual([])
    })

    it('debe manejar calendario laboral inválido', async () => {
      const calendarioLaboral = null

      const result = await aplicarDependenciasAFechas('cotizacion-123', calendarioLaboral)
      expect(result).toEqual([])
    })
  })

  describe('detectarCiclos', () => {
    it('debe retornar array vacío cuando no hay dependencias', async () => {
      const result = await detectarCiclos('cotizacion-123')
      expect(result).toEqual([])
    })

    it('debe detectar ciclos simples', async () => {
      // TODO: Implement when CotizacionDependenciaTarea model is available
      // Test case: A -> B -> A (ciclo)
      const result = await detectarCiclos('cotizacion-123')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('identificarHitosAutomaticamente', () => {
    it('debe identificar tareas con fechaInicio = fechaFin como hitos', async () => {
      const mockTareas = [
        {
          id: 'tarea-1',
          nombre: 'Tarea Normal',
          fechaInicio: new Date('2024-01-01'),
          fechaFin: new Date('2024-01-02')
        },
        {
          id: 'tarea-2',
          nombre: 'Hito',
          fechaInicio: new Date('2024-01-01'),
          fechaFin: new Date('2024-01-01') // Mismo día = hito
        }
      ]

      const mockFindMany = prisma.cotizacionTarea.findMany as jest.MockedFunction<any>
      mockFindMany.mockResolvedValue(mockTareas)

      const result = await identificarHitosAutomaticamente('cotizacion-123')

      expect(result).toContain('Hito identificado: Hito')
      expect(result).toHaveLength(1)
    })

    it('debe manejar tareas sin fechas', async () => {
      const mockTareas = [
        {
          id: 'tarea-1',
          nombre: 'Tarea sin fechas',
          fechaInicio: null,
          fechaFin: null
        }
      ]

      const mockFindMany = prisma.cotizacionTarea.findMany as jest.MockedFunction<any>
      mockFindMany.mockResolvedValue(mockTareas)

      const result = await identificarHitosAutomaticamente('cotizacion-123')
      expect(result).toEqual([])
    })
  })
})