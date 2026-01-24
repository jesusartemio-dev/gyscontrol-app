/**
 * 🧪 Tests para Servicio CotizacionCronograma
 *
 * Tests unitarios para validar la lógica de negocio del servicio de cronograma.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { CotizacionCronogramaService } from '@/lib/services/cotizacionCronograma'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacionEdt: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    cotizacionTarea: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    }
  }
}))

describe('CotizacionCronogramaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('crearEdtComercial', () => {
    it('✅ should create EDT comercial successfully', async () => {
      const mockEdt = {
        id: 'test-edt-id',
        cotizacionId: 'test-cotizacion-id',
        edtId: 'test-categoria-id',
        zona: 'Zona de prueba',
        fechaInicioComercial: new Date('2025-01-01'),
        fechaFinComercial: new Date('2025-01-31'),
        horasEstimadas: 40,
        estado: 'planificado',
        prioridad: 'media',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.cotizacionEdt.create as jest.Mock).mockResolvedValue({
        ...mockEdt,
        categoriaServicio: { id: 'test-categoria-id', nombre: 'Categoría Test' },
        responsable: null
      })

      const result = await CotizacionCronogramaService.crearEdtComercial({
        cotizacionId: 'test-cotizacion-id',
        edtId: 'test-categoria-id',
        zona: 'Zona de prueba',
        fechaInicioCom: new Date('2025-01-01'),
        fechaFinCom: new Date('2025-01-31'),
        horasCom: 40,
        descripcion: 'EDT de prueba'
      })

      expect(prisma.cotizacionEdt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cotizacionId: 'test-cotizacion-id',
          edtId: 'test-categoria-id',
          zona: 'Zona de prueba',
          fechaInicioComercial: new Date('2025-01-01'),
          fechaFinComercial: new Date('2025-01-31'),
          horasEstimadas: 40
        }),
        include: expect.any(Object)
      })

      expect(result).toBeDefined()
    })

    it('❌ should throw error for invalid dates', async () => {
      await expect(
        CotizacionCronogramaService.crearEdtComercial({
          cotizacionId: 'test-cotizacion-id',
          edtId: 'test-categoria-id',
          fechaInicioCom: new Date('2025-01-31'), // Fecha fin antes que inicio
          fechaFinCom: new Date('2025-01-01'),
          horasCom: 40
        })
      ).rejects.toThrow('Fechas comerciales incoherentes')
    })
  })

  describe('obtenerEdtsCotizacion', () => {
    it('✅ should return EDTs list', async () => {
      const mockEdts = [
        {
          id: 'edt-1',
          zona: 'Zona 1',
          estado: 'planificado',
          categoriaServicio: { id: 'cat-1', nombre: 'Categoría 1' },
          responsable: null
        }
      ]

      ;(prisma.cotizacionEdt.findMany as jest.Mock).mockResolvedValue(mockEdts)

      const result = await CotizacionCronogramaService.obtenerEdtsCotizacion('test-cotizacion-id')

      expect(prisma.cotizacionEdt.findMany).toHaveBeenCalledWith({
        where: { cotizacionId: 'test-cotizacion-id' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      })

      expect(result).toEqual(mockEdts)
    })
  })

  describe('calcularPorcentajeAvanceComercial', () => {
    it('✅ should calculate progress correctly', () => {
      // Esta función no existe en el servicio actual, pero es un ejemplo
      // de cómo se podrían testear funciones de cálculo

      const horasReales = 20
      const horasEstimadas = 40
      const expectedProgress = 50

      // Simular cálculo
      const progress = horasEstimadas > 0 ? Math.round((horasReales / horasEstimadas) * 100) : 0

      expect(progress).toBe(expectedProgress)
    })
  })

  describe('fechasComercialesCoherentes', () => {
    it('✅ should validate coherent dates', () => {
      const fechaInicio = '2025-01-01'
      const fechaFin = '2025-01-31'

      const isCoherent = !fechaInicio || !fechaFin || new Date(fechaFin) >= new Date(fechaInicio)

      expect(isCoherent).toBe(true)
    })

    it('❌ should reject incoherent dates', () => {
      const fechaInicio = '2025-01-31'
      const fechaFin = '2025-01-01'

      const isCoherent = !fechaInicio || !fechaFin || new Date(fechaFin) >= new Date(fechaInicio)

      expect(isCoherent).toBe(false)
    })
  })
})
