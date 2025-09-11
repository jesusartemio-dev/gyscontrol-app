// ===================================================
// 📁 Archivo: fechas.test.ts
// 📌 Ubicación: src/lib/utils/__tests__/fechas.test.ts
// 🔧 Descripción: Tests para utilidades de fechas de seguimiento
//
// 🧠 Uso: Validar funciones de cálculo y formateo de fechas
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  calcularDiasRestantes,
  getEstadoTiempo,
  formatearFecha,
  formatearFechaRelativa
} from '../fechas'

describe('🧪 Utilidades de Fechas', () => {
  beforeEach(() => {
    // Mock de fecha actual para pruebas consistentes
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-20T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('📅 calcularDiasRestantes', () => {
    it('✅ debe calcular días restantes para fecha futura', () => {
      const fechaFutura = new Date('2025-01-25T10:00:00Z') // 5 días después
      expect(calcularDiasRestantes(fechaFutura)).toBe(5)
    })

    it('✅ debe calcular días vencidos como negativos', () => {
      const fechaPasada = new Date('2025-01-15T10:00:00Z') // 5 días antes
      expect(calcularDiasRestantes(fechaPasada)).toBe(-5)
    })

    it('✅ debe retornar 0 para fecha actual', () => {
      const fechaActual = new Date('2025-01-20T10:00:00Z')
      expect(calcularDiasRestantes(fechaActual)).toBe(0)
    })

    it('✅ debe manejar diferentes zonas horarias', () => {
      const fechaMismoDia = new Date('2025-01-20T23:59:59Z')
      expect(calcularDiasRestantes(fechaMismoDia)).toBe(0)
    })

    it('✅ debe manejar fechas con milisegundos', () => {
      const fechaConMs = new Date('2025-01-22T15:30:45.123Z')
      expect(calcularDiasRestantes(fechaConMs)).toBe(2)
    })

    it('✅ debe manejar fechas muy lejanas', () => {
      const fechaLejana = new Date('2025-12-31T00:00:00Z')
      const diasEsperados = Math.floor(
        (fechaLejana.getTime() - new Date('2025-01-20T10:00:00Z').getTime()) / 
        (1000 * 60 * 60 * 24)
      )
      expect(calcularDiasRestantes(fechaLejana)).toBe(diasEsperados)
    })
  })

  describe('⏰ getEstadoTiempo', () => {
    it('✅ debe clasificar correctamente días vencidos', () => {
      expect(getEstadoTiempo(-1)).toBe('vencido')
      expect(getEstadoTiempo(-10)).toBe('vencido')
      expect(getEstadoTiempo(-100)).toBe('vencido')
    })

    it('✅ debe clasificar correctamente próximo vencimiento', () => {
      expect(getEstadoTiempo(0)).toBe('proximo_vencimiento')
      expect(getEstadoTiempo(1)).toBe('proximo_vencimiento')
      expect(getEstadoTiempo(3)).toBe('proximo_vencimiento')
      expect(getEstadoTiempo(7)).toBe('proximo_vencimiento')
    })

    it('✅ debe clasificar correctamente a tiempo', () => {
      expect(getEstadoTiempo(8)).toBe('a_tiempo')
      expect(getEstadoTiempo(15)).toBe('a_tiempo')
      expect(getEstadoTiempo(30)).toBe('a_tiempo')
      expect(getEstadoTiempo(365)).toBe('a_tiempo')
    })

    it('✅ debe manejar casos límite', () => {
      expect(getEstadoTiempo(7)).toBe('proximo_vencimiento') // Límite superior
      expect(getEstadoTiempo(8)).toBe('a_tiempo') // Justo después del límite
    })
  })

  describe('📝 formatearFecha', () => {
    it('✅ debe formatear fecha en formato dd/mm/yyyy por defecto', () => {
      const fecha = new Date('2025-01-20T10:00:00Z')
      expect(formatearFecha(fecha)).toBe('20/01/2025')
    })

    it('✅ debe formatear fecha con formato personalizado', () => {
      const fecha = new Date('2025-01-20T10:00:00Z')
      expect(formatearFecha(fecha, 'yyyy-mm-dd')).toBe('2025-01-20')
    })

    it('✅ debe manejar fechas de diferentes meses', () => {
      const fecha = new Date('2025-12-05T10:00:00Z')
      expect(formatearFecha(fecha)).toBe('05/12/2025')
    })

    it('✅ debe agregar ceros a la izquierda', () => {
      const fecha = new Date('2025-03-07T10:00:00Z')
      expect(formatearFecha(fecha)).toBe('07/03/2025')
    })

    it('✅ debe manejar años de 4 dígitos', () => {
      const fecha = new Date('2025-01-01T10:00:00Z')
      expect(formatearFecha(fecha)).toBe('01/01/2025')
    })
  })

  describe('🕐 formatearFechaRelativa', () => {
    it('✅ debe mostrar "Hoy" para fecha actual', () => {
      const fechaActual = new Date('2025-01-20T10:00:00Z')
      expect(formatearFechaRelativa(fechaActual)).toBe('Hoy')
    })

    it('✅ debe mostrar "Ayer" para fecha de ayer', () => {
      const ayer = new Date('2025-01-19T10:00:00Z')
      expect(formatearFechaRelativa(ayer)).toBe('Ayer')
    })

    it('✅ debe mostrar "Mañana" para fecha de mañana', () => {
      const manana = new Date('2025-01-21T10:00:00Z')
      expect(formatearFechaRelativa(manana)).toBe('Mañana')
    })

    it('✅ debe mostrar días para fechas cercanas', () => {
      const en3Dias = new Date('2025-01-23T10:00:00Z')
      expect(formatearFechaRelativa(en3Dias)).toBe('En 3 días')
      
      const hace2Dias = new Date('2025-01-18T10:00:00Z')
      expect(formatearFechaRelativa(hace2Dias)).toBe('Hace 2 días')
    })

    it('✅ debe mostrar fecha completa para fechas lejanas', () => {
      const fechaLejana = new Date('2025-02-15T10:00:00Z')
      expect(formatearFechaRelativa(fechaLejana)).toBe('15/02/2025')
      
      const fechaPasadaLejana = new Date('2024-12-15T10:00:00Z')
      expect(formatearFechaRelativa(fechaPasadaLejana)).toBe('15/12/2024')
    })

    it('✅ debe manejar diferentes horas del mismo día', () => {
      const fechaMismoDiaTarde = new Date('2025-01-20T23:59:59Z')
      expect(formatearFechaRelativa(fechaMismoDiaTarde)).toBe('Hoy')
      
      const fechaMismoDiaManana = new Date('2025-01-20T00:00:01Z')
      expect(formatearFechaRelativa(fechaMismoDiaManana)).toBe('Hoy')
    })
  })

  describe('🎯 Casos de integración', () => {
    it('✅ debe funcionar en conjunto para análisis de tiempo', () => {
      const fechaProxima = new Date('2025-01-25T10:00:00Z')
      
      const diasRestantes = calcularDiasRestantes(fechaProxima)
      const estado = getEstadoTiempo(diasRestantes)
      const fechaFormateada = formatearFecha(fechaProxima)
      const fechaRelativa = formatearFechaRelativa(fechaProxima)
      
      expect(diasRestantes).toBe(5)
      expect(estado).toBe('proximo_vencimiento')
      expect(fechaFormateada).toBe('25/01/2025')
      expect(fechaRelativa).toBe('En 5 días')
    })

    it('✅ debe manejar fecha vencida correctamente', () => {
      const fechaVencida = new Date('2025-01-17T10:00:00Z')
      
      const diasRestantes = calcularDiasRestantes(fechaVencida)
      const estado = getEstadoTiempo(diasRestantes)
      const fechaFormateada = formatearFecha(fechaVencida)
      const fechaRelativa = formatearFechaRelativa(fechaVencida)
      
      expect(diasRestantes).toBe(-3)
      expect(estado).toBe('vencido')
      expect(fechaFormateada).toBe('17/01/2025')
      expect(fechaRelativa).toBe('Hace 3 días')
    })

    it('✅ debe manejar fecha muy futura', () => {
      const fechaFutura = new Date('2025-03-15T10:00:00Z')
      
      const diasRestantes = calcularDiasRestantes(fechaFutura)
      const estado = getEstadoTiempo(diasRestantes)
      const fechaFormateada = formatearFecha(fechaFutura)
      const fechaRelativa = formatearFechaRelativa(fechaFutura)
      
      expect(diasRestantes).toBeGreaterThan(30)
      expect(estado).toBe('a_tiempo')
      expect(fechaFormateada).toBe('15/03/2025')
      expect(fechaRelativa).toBe('15/03/2025') // Fecha lejana muestra formato completo
    })
  })

  describe('🛡️ Casos edge y validación', () => {
    it('✅ debe manejar fechas inválidas', () => {
      const fechaInvalida = new Date('fecha-invalida')
      
      // Las funciones deben manejar fechas inválidas sin fallar
      expect(() => calcularDiasRestantes(fechaInvalida)).not.toThrow()
      expect(() => formatearFecha(fechaInvalida)).not.toThrow()
      expect(() => formatearFechaRelativa(fechaInvalida)).not.toThrow()
    })

    it('✅ debe manejar fechas muy antiguas', () => {
      const fechaAntigua = new Date('1900-01-01T00:00:00Z')
      
      const diasRestantes = calcularDiasRestantes(fechaAntigua)
      const estado = getEstadoTiempo(diasRestantes)
      
      expect(diasRestantes).toBeLessThan(0)
      expect(estado).toBe('vencido')
    })

    it('✅ debe manejar fechas muy futuras', () => {
      const fechaFutura = new Date('2100-12-31T23:59:59Z')
      
      const diasRestantes = calcularDiasRestantes(fechaFutura)
      const estado = getEstadoTiempo(diasRestantes)
      
      expect(diasRestantes).toBeGreaterThan(1000)
      expect(estado).toBe('a_tiempo')
    })
  })
})
