import { describe, it, expect } from '@jest/globals'
import {
  validarSaldoCompHe,
  calcularHorasRequeridas,
  diasCompensablesDisponibles,
  formatearSaldo,
  HORAS_POR_DIA_COMP_HE,
} from '@/services/ausencias/compHeValidacion'

describe('COMP_HE — validarSaldoCompHe', () => {
  it('1 día con saldo 8h → bloquear (necesita 9.5h)', () => {
    const result = validarSaldoCompHe(8, 1)
    expect(result.ok).toBe(false)
    expect(result.horasRequeridas).toBe(9.5)
    expect(result.mensaje).toContain('8h')
    expect(result.mensaje).toContain('9.5h')
  })

  it('1 día con saldo exacto 9.5h → permitir, saldo queda en 0h', () => {
    const result = validarSaldoCompHe(9.5, 1)
    expect(result.ok).toBe(true)
    expect(result.horasRequeridas).toBe(9.5)
    expect(result.mensaje).toBeUndefined()
    // Saldo resultante: 9.5 - 9.5 = 0
    expect(9.5 - result.horasRequeridas).toBe(0)
  })

  it('2 días con saldo 20h → permitir (necesita 19h, queda 1h)', () => {
    const result = validarSaldoCompHe(20, 2)
    expect(result.ok).toBe(true)
    expect(result.horasRequeridas).toBe(19)
    expect(20 - result.horasRequeridas).toBe(1)
  })

  it('ajuste manual +5h → diasCompensables refleja correctamente', () => {
    // Un ajuste de +5h a un saldo de 4h da 9h — aún 0 días compensables
    expect(diasCompensablesDisponibles(9)).toBe(0)
    // Un ajuste de +0.5h más da 9.5h — 1 día compensable
    expect(diasCompensablesDisponibles(9.5)).toBe(1)
    // Verificar constante de jornada
    expect(HORAS_POR_DIA_COMP_HE).toBe(9.5)
  })
})

describe('COMP_HE — funciones auxiliares', () => {
  it('calcularHorasRequeridas devuelve dias * 9.5', () => {
    expect(calcularHorasRequeridas(0)).toBe(0)
    expect(calcularHorasRequeridas(1)).toBe(9.5)
    expect(calcularHorasRequeridas(3)).toBe(28.5)
  })

  it('diasCompensablesDisponibles trunca al piso', () => {
    expect(diasCompensablesDisponibles(0)).toBe(0)
    expect(diasCompensablesDisponibles(9.4)).toBe(0)
    expect(diasCompensablesDisponibles(9.5)).toBe(1)
    expect(diasCompensablesDisponibles(19)).toBe(2)
    expect(diasCompensablesDisponibles(-29)).toBe(-4) // saldo negativo → días negativos
  })

  it('formatearSaldo usa "h" para COMP_HE y "d" para otros', () => {
    expect(formatearSaldo(15, 'VAC')).toBe('15d')
    expect(formatearSaldo(8, 'COMP_HE')).toBe('8h')
    expect(formatearSaldo(-29, 'COMP_HE')).toBe('-29h')
    expect(formatearSaldo(0, 'LIC_MED')).toBe('0d')
  })
})
