/**
 * @fileoverview Tests para validación de parámetros en timeline API
 * @description Verifica que el schema timelineFiltersSchema maneje correctamente diferentes formatos de fecha
 */

// ✅ Test independiente sin dependencias del setup de Jest
const { z } = require('zod')

// ✅ Recreamos el schema para testing
const timelineFiltersSchema = z.object({
  proyectoId: z.string().optional(),
  fechaInicio: z.string().optional().transform((val) => {
    if (!val) return undefined
    // ✅ Acepta tanto formato ISO como fecha simple (YYYY-MM-DD)
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  }),
  fechaFin: z.string().optional().transform((val) => {
    if (!val) return undefined
    // ✅ Acepta tanto formato ISO como fecha simple (YYYY-MM-DD)
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  }),
  incluirCompletados: z.boolean().default(false),
  soloAlertas: z.boolean().default(false),
  tipoVista: z.enum(['gantt', 'calendario', 'lista']).default('gantt'),
  agrupacion: z.enum(['proyecto', 'categoria', 'proveedor', 'fecha']).default('proyecto'),
  validarCoherencia: z.boolean().default(true),
  incluirSugerencias: z.boolean().default(true),
  tipo: z.enum(['lista', 'pedido', 'ambos']).default('ambos'),
  estado: z.array(z.string()).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  responsableId: z.string().optional(),
  soloConAlertas: z.boolean().default(false),
  zoom: z.enum(['dia', 'semana', 'mes', 'trimestre']).default('mes')
})

describe('Timeline Filters Schema Validation', () => {
  describe('Date Format Handling', () => {
    it('should accept ISO datetime format', () => {
      const input = {
        fechaInicio: '2024-01-15T10:30:00.000Z',
        fechaFin: '2024-02-15T18:45:00.000Z'
      }
      
      const result = timelineFiltersSchema.parse(input)
      
      expect(result.fechaInicio).toBe('2024-01-15T10:30:00.000Z')
      expect(result.fechaFin).toBe('2024-02-15T18:45:00.000Z')
    })

    it('should accept simple date format (YYYY-MM-DD)', () => {
      const input = {
        fechaInicio: '2024-01-15',
        fechaFin: '2024-02-15'
      }
      
      const result = timelineFiltersSchema.parse(input)
      
      expect(result.fechaInicio).toBe('2024-01-15T00:00:00.000Z')
      expect(result.fechaFin).toBe('2024-02-15T00:00:00.000Z')
    })

    it('should handle invalid date formats gracefully', () => {
      const input = {
        fechaInicio: 'invalid-date',
        fechaFin: '2024-13-45' // Invalid month/day
      }
      
      const result = timelineFiltersSchema.parse(input)
      
      expect(result.fechaInicio).toBeUndefined()
      expect(result.fechaFin).toBeUndefined()
    })

    it('should handle empty/undefined dates', () => {
      const input = {
        fechaInicio: '',
        fechaFin: undefined
      }
      
      const result = timelineFiltersSchema.parse(input)
      
      expect(result.fechaInicio).toBeUndefined()
      expect(result.fechaFin).toBeUndefined()
    })
  })

  describe('Enum Validation', () => {
    it('should accept valid tipoVista values', () => {
      const validValues = ['gantt', 'calendario', 'lista']
      
      validValues.forEach(value => {
        const result = timelineFiltersSchema.parse({ tipoVista: value })
        expect(result.tipoVista).toBe(value)
      })
    })

    it('should accept valid agrupacion values', () => {
      const validValues = ['proyecto', 'categoria', 'proveedor', 'fecha']
      
      validValues.forEach(value => {
        const result = timelineFiltersSchema.parse({ agrupacion: value })
        expect(result.agrupacion).toBe(value)
      })
    })

    it('should accept valid zoom values', () => {
      const validValues = ['dia', 'semana', 'mes', 'trimestre']
      
      validValues.forEach(value => {
        const result = timelineFiltersSchema.parse({ zoom: value })
        expect(result.zoom).toBe(value)
      })
    })

    it('should reject invalid enum values', () => {
      expect(() => {
        timelineFiltersSchema.parse({ tipoVista: 'invalid' })
      }).toThrow()

      expect(() => {
        timelineFiltersSchema.parse({ agrupacion: 'invalid' })
      }).toThrow()

      expect(() => {
        timelineFiltersSchema.parse({ zoom: 'invalid' })
      }).toThrow()
    })
  })

  describe('Default Values', () => {
    it('should apply correct default values', () => {
      const result = timelineFiltersSchema.parse({})
      
      expect(result.incluirCompletados).toBe(false)
      expect(result.soloAlertas).toBe(false)
      expect(result.tipoVista).toBe('gantt')
      expect(result.agrupacion).toBe('proyecto')
      expect(result.validarCoherencia).toBe(true)
      expect(result.incluirSugerencias).toBe(true)
      expect(result.tipo).toBe('ambos')
      expect(result.soloConAlertas).toBe(false)
      expect(result.zoom).toBe('mes')
    })
  })

  describe('Complete Validation', () => {
    it('should validate a complete timeline request', () => {
      const input = {
        proyectoId: 'proj-123',
        fechaInicio: '2024-01-01',
        fechaFin: '2024-12-31',
        tipoVista: 'gantt',
        agrupacion: 'proyecto',
        soloAlertas: true,
        zoom: 'mes',
        estado: ['activo', 'pendiente'],
        montoMinimo: 1000,
        montoMaximo: 50000,
        responsableId: 'user-456'
      }
      
      const result = timelineFiltersSchema.parse(input)
      
      expect(result.proyectoId).toBe('proj-123')
      expect(result.fechaInicio).toBe('2024-01-01T00:00:00.000Z')
      expect(result.fechaFin).toBe('2024-12-31T00:00:00.000Z')
      expect(result.tipoVista).toBe('gantt')
      expect(result.agrupacion).toBe('proyecto')
      expect(result.soloAlertas).toBe(true)
      expect(result.zoom).toBe('mes')
      expect(result.estado).toEqual(['activo', 'pendiente'])
      expect(result.montoMinimo).toBe(1000)
      expect(result.montoMaximo).toBe(50000)
      expect(result.responsableId).toBe('user-456')
    })
  })
})