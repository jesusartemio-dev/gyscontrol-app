// ===================================================
// 📁 Archivo: listaEquipo.fechas.test.ts
// 📌 Ubicación: src/lib/services/__tests__/listaEquipo.fechas.test.ts
// 🔧 Descripción: Tests para funcionalidad de fechas de seguimiento en ListaEquipo
//
// 🧠 Uso: Validar cálculos de tiempo, estados y utilidades de fecha
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  calcularDiasRestantes,
  getEstadoTiempo
} from '@/lib/utils/fechas'

// Mock de funciones de servicio que crearemos
const updateFechaNecesaria = vi.fn()
const getTimelineFechas = vi.fn()

// Mock del servicio listaEquipo
vi.mock('../listaEquipo', () => ({
  updateFechaNecesaria,
  getTimelineFechas
}))

// 🎯 Mock fetch para las pruebas
global.fetch = vi.fn()

describe('🧪 ListaEquipo - Funcionalidad de Fechas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock de fecha actual para pruebas consistentes
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-20T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('📅 calcularDiasRestantes', () => {
    it('✅ debe calcular días restantes correctamente para fecha futura', () => {
      const fechaFutura = new Date('2025-01-25T10:00:00Z') // 5 días después
      const resultado = calcularDiasRestantes(fechaFutura)
      expect(resultado).toBe(5)
    })

    it('✅ debe calcular días vencidos como negativos', () => {
      const fechaPasada = new Date('2025-01-15T10:00:00Z') // 5 días antes
      const resultado = calcularDiasRestantes(fechaPasada)
      expect(resultado).toBe(-5)
    })

    it('✅ debe retornar 0 para fecha actual', () => {
      const fechaActual = new Date('2025-01-20T10:00:00Z')
      const resultado = calcularDiasRestantes(fechaActual)
      expect(resultado).toBe(0)
    })

    it('✅ debe manejar fechas con diferentes horas del mismo día', () => {
      const fechaMismoDia = new Date('2025-01-20T23:59:59Z')
      const resultado = calcularDiasRestantes(fechaMismoDia)
      expect(resultado).toBe(0)
    })
  })

  describe('⏰ getEstadoTiempo', () => {
    it('✅ debe retornar "vencido" para días negativos', () => {
      expect(getEstadoTiempo(-1)).toBe('vencido')
      expect(getEstadoTiempo(-10)).toBe('vencido')
    })

    it('✅ debe retornar "proximo_vencimiento" para 0-7 días', () => {
      expect(getEstadoTiempo(0)).toBe('proximo_vencimiento')
      expect(getEstadoTiempo(3)).toBe('proximo_vencimiento')
      expect(getEstadoTiempo(7)).toBe('proximo_vencimiento')
    })

    it('✅ debe retornar "a_tiempo" para más de 7 días', () => {
      expect(getEstadoTiempo(8)).toBe('a_tiempo')
      expect(getEstadoTiempo(30)).toBe('a_tiempo')
    })
  })

  describe('📝 updateFechaNecesaria', () => {
    it('✅ debe actualizar fechaNecesaria correctamente', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'lista-123',
          fechaNecesaria: '2025-01-30T00:00:00Z'
        })
      }
      
      ;(fetch as any).mockResolvedValueOnce(mockResponse)

      const resultado = await updateFechaNecesaria('lista-123', new Date('2025-01-30'))
      
      expect(fetch).toHaveBeenCalledWith('/api/lista-equipo/lista-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaNecesaria: '2025-01-30T00:00:00.000Z' })
      })
      
      expect(resultado).toEqual({
        id: 'lista-123',
        fechaNecesaria: '2025-01-30T00:00:00Z'
      })
    })

    it('❌ debe manejar errores de API', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(updateFechaNecesaria('lista-inexistente', new Date()))
        .rejects.toThrow('Error al actualizar fecha necesaria')
    })
  })

  describe('📊 getTimelineFechas', () => {
    const mockListaEquipo = {
      id: 'lista-123',
      fechaNecesaria: new Date('2025-02-01'),
      fechaEnvioRevision: new Date('2025-01-15'),
      fechaValidacion: new Date('2025-01-16'),
      fechaAprobacionRevision: new Date('2025-01-17'),
      fechaEnvioLogistica: new Date('2025-01-18'),
      fechaInicioCotizacion: new Date('2025-01-19'),
      fechaFinCotizacion: new Date('2025-01-20'),
      fechaAprobacionFinal: null,
      estado: 'cotizacion'
    }

    it('✅ debe generar timeline ordenado cronológicamente', () => {
      const timeline = getTimelineFechas(mockListaEquipo as any)
      
      expect(timeline).toHaveLength(6) // Solo fechas no nulas
      expect(timeline[0].tipo).toBe('fechaEnvioRevision')
      expect(timeline[timeline.length - 1].tipo).toBe('fechaFinCotizacion')
      
      // Verificar orden cronológico
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].fecha.getTime()).toBeGreaterThanOrEqual(
          timeline[i - 1].fecha.getTime()
        )
      }
    })

    it('✅ debe incluir fechaNecesaria al final si existe', () => {
      const timeline = getTimelineFechas(mockListaEquipo as any)
      const fechaNecesaria = timeline.find((item: any) => item.tipo === 'fechaNecesaria')
      
      expect(fechaNecesaria).toBeDefined()
      expect(fechaNecesaria?.esFutura).toBe(true)
    })

    it('✅ debe marcar correctamente fechas futuras', () => {
      const timeline = getTimelineFechas(mockListaEquipo as any)
      
      timeline.forEach((item: any) => {
        if (item.tipo === 'fechaNecesaria') {
          expect(item.esFutura).toBe(true)
        } else {
          expect(item.esFutura).toBe(false)
        }
      })
    })

    it('✅ debe manejar lista sin fechas', () => {
      const listaVacia = {
        id: 'lista-vacia',
        fechaNecesaria: null,
        fechaEnvioRevision: null,
        fechaValidacion: null,
        fechaAprobacionRevision: null,
        fechaEnvioLogistica: null,
        fechaInicioCotizacion: null,
        fechaFinCotizacion: null,
        fechaAprobacionFinal: null,
        estado: 'borrador'
      }
      
      const timeline = getTimelineFechas(listaVacia as any)
      expect(timeline).toHaveLength(0)
    })
  })

  describe('🎯 Casos de integración', () => {
    it('✅ debe calcular estado de tiempo para lista próxima a vencer', () => {
      const fechaProxima = new Date('2025-01-25T10:00:00Z') // 5 días
      const diasRestantes = calcularDiasRestantes(fechaProxima)
      const estado = getEstadoTiempo(diasRestantes)
      
      expect(diasRestantes).toBe(5)
      expect(estado).toBe('proximo_vencimiento')
    })

    it('✅ debe identificar lista vencida correctamente', () => {
      const fechaVencida = new Date('2025-01-18T10:00:00Z') // 2 días atrás
      const diasRestantes = calcularDiasRestantes(fechaVencida)
      const estado = getEstadoTiempo(diasRestantes)
      
      expect(diasRestantes).toBe(-2)
      expect(estado).toBe('vencido')
    })

    it('✅ debe manejar timeline completo de una lista', () => {
      const listaCompleta = {
        id: 'lista-completa',
        fechaNecesaria: new Date('2025-02-15'),
        fechaEnvioRevision: new Date('2025-01-10'),
        fechaValidacion: new Date('2025-01-11'),
        fechaAprobacionRevision: new Date('2025-01-12'),
        fechaEnvioLogistica: new Date('2025-01-13'),
        fechaInicioCotizacion: new Date('2025-01-14'),
        fechaFinCotizacion: new Date('2025-01-15'),
        fechaAprobacionFinal: new Date('2025-01-16'),
        estado: 'aprobada'
      }
      
      const timeline = getTimelineFechas(listaCompleta as any)
      const diasHastaVencimiento = calcularDiasRestantes(listaCompleta.fechaNecesaria)
      const estadoTiempo = getEstadoTiempo(diasHastaVencimiento)
      
      expect(timeline).toHaveLength(8) // Todas las fechas
      expect(diasHastaVencimiento).toBe(26) // Días hasta feb 15
      expect(estadoTiempo).toBe('a_tiempo')
    })
  })
})
