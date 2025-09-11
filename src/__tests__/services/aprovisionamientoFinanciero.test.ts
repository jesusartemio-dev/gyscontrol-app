// ===================================================
// 📁 Archivo: aprovisionamientoFinanciero.test.ts
// 📌 Ubicación: src/lib/services/__tests__/
// 🔧 Descripción: Tests para el servicio de aprovisionamiento financiero
//
// 🧠 Funcionalidades testeadas:
// - Obtención de proyectos consolidados
// - Filtros y paginación
// - Formateo de datos
// - Manejo de errores
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { 
  obtenerProyectosConsolidados,
  formatearMonto,
  formatearFecha,
  obtenerVariantAlertas,
  obtenerVariantProgreso,
  type FiltrosAprovisionamiento
} from '@/lib/services/aprovisionamientoFinanciero'

// 🔧 Mock de fetch global
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// 🔧 Mock de getBaseUrl
jest.mock('@/lib/utils', () => ({
  getBaseUrl: jest.fn(() => 'http://localhost:3000')
}))

// 🔧 Mock de Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}))

// 🔧 Mock de logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('AprovisionamientoFinanciero Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('obtenerProyectosConsolidados', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: '1',
          nombre: 'Proyecto Test',
          codigo: 'PRY-001',
          responsable: 'Juan Pérez',
          estado: 'activo',
          presupuestoTotal: 100000,
          presupuestoEjecutado: 50000,
          progreso: 50,
          fechaInicio: new Date('2024-01-01'),
          fechaFin: new Date('2024-12-31'),
          alertas: 2,
          moneda: 'PEN'
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      },
      kpis: {
        totalProyectos: 1,
        proyectosActivos: 1,
        proyectosPausados: 0,
        presupuestoTotal: 100000,
        presupuestoEjecutado: 50000,
        alertasActivas: 2
      }
    }

    it('✅ debe obtener proyectos consolidados exitosamente', async () => {
      // 🔧 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const filtros: FiltrosAprovisionamiento = {
        search: 'test',
        estado: 'activo',
        page: 1,
        limit: 10
      }

      // 🎯 Act
      const result = await obtenerProyectosConsolidados(filtros)

      // ✅ Assert
      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finanzas/aprovisionamiento/proyectos'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('✅ debe construir URL correctamente con filtros', async () => {
      // 🔧 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const filtros: FiltrosAprovisionamiento = {
        search: 'proyecto test',
        estado: 'activo',
        responsable: 'juan.perez',
        fechaInicio: '2024-01-01',
        fechaFin: '2024-12-31',
        alertas: true,
        page: 2,
        limit: 20
      }

      // 🎯 Act
      await obtenerProyectosConsolidados(filtros)

      // ✅ Assert
      const calledUrl = (mockFetch.mock.calls[0][0] as string)
      expect(calledUrl).toContain('search=proyecto+test') // URLSearchParams usa '+' para espacios
      expect(calledUrl).toContain('estado=activo')
      expect(calledUrl).toContain('responsable=juan.perez')
      expect(calledUrl).toContain('fechaInicio=2024-01-01')
      expect(calledUrl).toContain('fechaFin=2024-12-31')
      expect(calledUrl).toContain('alertas=true')
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('limit=20')
    })

    it('✅ debe manejar filtros vacíos correctamente', async () => {
      // 🔧 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      // 🎯 Act
      await obtenerProyectosConsolidados({})

      // ✅ Assert
      const calledUrl = (mockFetch.mock.calls[0][0] as string)
      expect(calledUrl).toContain('page=1')
      expect(calledUrl).toContain('limit=10')
      expect(calledUrl).not.toContain('search=')
      expect(calledUrl).not.toContain('estado=')
    })

    it('❌ debe manejar errores de red', async () => {
      // 🔧 Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 🎯 Act
      const result = await obtenerProyectosConsolidados({})

      // ✅ Assert - debe devolver respuesta de error
      expect(result.success).toBe(false)
      expect(result.data).toHaveLength(0)
    })

    it('❌ debe manejar respuestas HTTP de error', async () => {
      // 🔧 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      // 🎯 Act
      const result = await obtenerProyectosConsolidados({})

      // ✅ Assert - debe devolver respuesta de error
      expect(result.success).toBe(false)
      expect(result.data).toHaveLength(0)
    })

    it('❌ debe manejar respuestas con success: false', async () => {
      // 🔧 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Error del servidor'
        })
      } as Response)

      // 🎯 Act
      const result = await obtenerProyectosConsolidados({})

      // ✅ Assert - debe devolver respuesta de error
      expect(result.success).toBe(false)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('formatearMonto', () => {
    it('✅ debe formatear montos en PEN correctamente', () => {
      const resultado1 = formatearMonto(1000, 'PEN')
      const resultado2 = formatearMonto(1234.56, 'PEN')
      const resultado3 = formatearMonto(0, 'PEN')
      
      expect(resultado1).toContain('1,000')
      expect(resultado2).toContain('1,234')
      expect(resultado3).toContain('0')
    })

    it('✅ debe formatear montos en USD correctamente', () => {
      const resultado1 = formatearMonto(1000, 'USD')
      const resultado2 = formatearMonto(1234.56, 'USD')
      const resultado3 = formatearMonto(0, 'USD')
      
      expect(resultado1).toContain('1,000')
      expect(resultado2).toContain('1,234')
      expect(resultado3).toContain('0')
    })

    it('✅ debe usar PEN como moneda por defecto', () => {
      const resultado = formatearMonto(1000)
      expect(resultado).toContain('1,000')
    })

    it('✅ debe manejar números negativos', () => {
      const resultadoPEN = formatearMonto(-1000, 'PEN')
      const resultadoUSD = formatearMonto(-1234.56, 'USD')
      expect(resultadoPEN).toContain('-')
      expect(resultadoPEN).toContain('1,000')
      expect(resultadoUSD).toContain('-')
      expect(resultadoUSD).toContain('1,234')
    })
  })

  describe('formatearFecha', () => {
    it('✅ debe formatear fechas correctamente', () => {
      const fecha = new Date('2024-01-15T10:30:00Z')
      const resultado = formatearFecha(fecha)
      expect(resultado).toContain('ene')
      expect(resultado).toContain('2024')
    })

    it('✅ debe manejar fechas como string', () => {
      const resultado = formatearFecha('2024-01-15')
      expect(resultado).toContain('ene')
      expect(resultado).toContain('2024')
    })

    it('❌ debe manejar fechas inválidas', () => {
      expect(() => formatearFecha('fecha-invalida')).toThrow()
    })
  })

  describe('obtenerVariantAlertas', () => {
    it('✅ debe retornar variant correcto según número de alertas', () => {
      expect(obtenerVariantAlertas(0)).toBe('outline')      // Sin alertas
      expect(obtenerVariantAlertas(1)).toBe('secondary')    // Pocas alertas (1-2)
      expect(obtenerVariantAlertas(2)).toBe('secondary')    // Pocas alertas (1-2)
      expect(obtenerVariantAlertas(3)).toBe('destructive')  // Muchas alertas (>2)
      expect(obtenerVariantAlertas(5)).toBe('destructive')  // Muchas alertas (>2)
    })
  })

  describe('obtenerVariantProgreso', () => {
    it('✅ debe retornar variant correcto según progreso', () => {
      expect(obtenerVariantProgreso(0)).toBe('destructive')  // < 20
      expect(obtenerVariantProgreso(25)).toBe('outline')     // 20-49
      expect(obtenerVariantProgreso(50)).toBe('secondary')   // 50-79
      expect(obtenerVariantProgreso(75)).toBe('secondary')   // 50-79
      expect(obtenerVariantProgreso(90)).toBe('default')     // >= 80
      expect(obtenerVariantProgreso(100)).toBe('default')
    })

    it('✅ debe manejar valores fuera de rango', () => {
      expect(obtenerVariantProgreso(-10)).toBe('destructive')
      expect(obtenerVariantProgreso(110)).toBe('default')
    })
  })
})

// 🔧 Tests de integración
describe('AprovisionamientoFinanciero Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('✅ debe procesar respuesta completa correctamente', async () => {
    // 🔧 Mock de datos simples
    const mockResponse = {
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
    }

    // 🔧 Mock de fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    // 🎯 Ejecutar
    const result = await obtenerProyectosConsolidados({
      page: 1,
      limit: 10
    })

    // ✅ Assert
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.kpis.totalProyectos).toBe(0)
  })
})