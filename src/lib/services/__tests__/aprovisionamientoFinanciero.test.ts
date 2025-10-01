// ===================================================
// 📁 Archivo: aprovisionamientoFinanciero.test.ts
// 📌 Ubicación: src/lib/services/__tests__/
// 🔧 Descripción: Tests para el servicio de aprovisionamiento financiero
//
// 🧠 Funcionalidades testeadas:
// - Obtener proyectos consolidados
// - Obtener KPIs consolidados
// - Búsqueda de proyectos
// - Funciones de formateo
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import {
  obtenerProyectosConsolidados,
  obtenerKPIsConsolidados,
  buscarProyectos,
  formatearMonto,
  formatearFecha,
  obtenerVariantProgreso,
  obtenerVariantAlertas,
  type ProyectoConsolidado,
  type KPIsConsolidados,
  type FiltrosAprovisionamiento
} from '../aprovisionamientoFinanciero'

// 🔧 Mock global fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('AprovisionamientoFinanciero Service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Mock successful response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        kpis: {
          totalProyectos: 0,
          proyectosActivos: 0,
          proyectosPausados: 0,
          proyectosCompletados: 0,
          totalListas: 0,
          totalPedidos: 0,
          montoTotalListas: 0,
          montoTotalPedidos: 0,
          totalAlertas: 0,
          progresoPromedio: 0
        },
        timestamp: new Date().toISOString()
      })
    } as Response)
  })

  describe('obtenerProyectosConsolidados', () => {
    it('should fetch projects with default filters', async () => {
      const result = await obtenerProyectosConsolidados()
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finanzas/aprovisionamiento/proyectos'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('kpis')
      expect(result).toHaveProperty('pagination')
    })

    it('should apply filters correctly', async () => {
      const filtros: FiltrosAprovisionamiento = {
        page: 2,
        limit: 20,
        search: 'test',
        estado: 'activo',
        responsable: 'Juan Pérez',
        alertas: true
      }

      await obtenerProyectosConsolidados(filtros)
      
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('page=2')
      expect(callUrl).toContain('limit=20')
      expect(callUrl).toContain('search=test')
      expect(callUrl).toContain('estado=activo')
      expect(callUrl).toContain('responsable=Juan%20P%C3%A9rez')
      expect(callUrl).toContain('alertas=true')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(obtenerProyectosConsolidados()).rejects.toThrow(
        'Error al obtener proyectos consolidados: 500 Internal Server Error'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(obtenerProyectosConsolidados()).rejects.toThrow(
        'Error de red al obtener proyectos consolidados: Network error'
      )
    })
  })

  describe('obtenerKPIsConsolidados', () => {
    it('should fetch KPIs successfully', async () => {
      const mockKPIs: KPIsConsolidados = {
        totalProyectos: 10,
        proyectosActivos: 7,
        proyectosPausados: 2,
        proyectosCompletados: 1,
        totalListas: 25,
        totalPedidos: 15,
        montoTotalListas: 150000,
        montoTotalPedidos: 120000,
        totalAlertas: 3,
        progresoPromedio: 75
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockKPIs })
      } as Response)

      const result = await obtenerKPIsConsolidados()
      
      expect(result).toEqual(mockKPIs)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finanzas/aprovisionamiento/proyectos/kpis'),
        expect.any(Object)
      )
    })
  })

  describe('buscarProyectos', () => {
    it('should search projects with term', async () => {
      const mockProyectos: ProyectoConsolidado[] = [
        {
          id: '1',
          nombre: 'Proyecto Test',
          codigo: 'PRY-001',
          estado: 'activo',
          responsable: 'Juan Pérez',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          presupuestoTotal: 100000,
          presupuestoEjecutado: 50000,
          listas: { total: 5, aprobadas: 3, pendientes: 2, montoTotal: 25000 },
          pedidos: { total: 3, enviados: 2, pendientes: 1, montoTotal: 20000 },
          alertas: 1,
          progreso: 50,
          moneda: 'USD'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProyectos
      } as Response)

      const result = await buscarProyectos('test', 5)
      
      expect(result).toEqual(mockProyectos)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      )
    })
  })

  describe('Utility Functions', () => {
    describe('formatearMonto', () => {
      it('should format PEN currency correctly', () => {
        expect(formatearMonto(1000, 'PEN')).toBe('S/ 1,000.00')
        expect(formatearMonto(1234.56, 'PEN')).toBe('S/ 1,234.56')
        expect(formatearMonto(0, 'PEN')).toBe('S/ 0.00')
      })

      it('should format USD currency correctly', () => {
        expect(formatearMonto(1000, 'USD')).toBe('$ 1,000.00')
        expect(formatearMonto(1234.56, 'USD')).toBe('$ 1,234.56')
      })

      it('should default to PEN when no currency specified', () => {
        expect(formatearMonto(1000)).toBe('S/ 1,000.00')
      })
    })

    describe('formatearFecha', () => {
      it('should format date correctly', () => {
        const fecha = '2025-01-20T10:30:00Z'
        const resultado = formatearFecha(fecha)
        
        expect(resultado).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      })

      it('should handle invalid dates', () => {
        expect(() => formatearFecha('invalid-date')).not.toThrow()
      })
    })

    describe('obtenerVariantProgreso', () => {
      it('should return correct variants based on progress', () => {
        expect(obtenerVariantProgreso(0)).toBe('outline')
        expect(obtenerVariantProgreso(25)).toBe('destructive')
        expect(obtenerVariantProgreso(50)).toBe('secondary')
        expect(obtenerVariantProgreso(75)).toBe('default')
        expect(obtenerVariantProgreso(100)).toBe('default')
      })
    })

    describe('obtenerVariantAlertas', () => {
      it('should return correct variants based on alert count', () => {
        expect(obtenerVariantAlertas(0)).toBe('outline')
        expect(obtenerVariantAlertas(1)).toBe('secondary')
        expect(obtenerVariantAlertas(3)).toBe('destructive')
        expect(obtenerVariantAlertas(10)).toBe('destructive')
      })
    })
  })
})
