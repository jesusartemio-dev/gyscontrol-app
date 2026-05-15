// Force Lima/Bogota timezone (UTC-5) so tests reproduce the production-like offset
// where Prisma @db.Date UTC-midnight dates differ from local midnight dates.
process.env.TZ = 'America/Bogota'

import { describe, it, expect } from '@jest/globals'
import { calcularDiasHabilesSync } from '@/services/ausencias/calcularDiasHabiles'
import type { TurnoDia } from '@prisma/client'

// Helper to create a Date at midnight local time from a YYYY-MM-DD string
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day, 0, 0, 0, 0)
}

const FULL: TurnoDia = 'dia_completo'
const AM: TurnoDia = 'am'
const PM: TurnoDia = 'pm'

describe('calcularDiasHabilesSync', () => {
  // ── Same-day cases ────────────────────────────────────────────────────────

  it('1 día completo (dia_completo + dia_completo) = 1', () => {
    // 2026-05-18 is a Monday
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-18'), FULL, FULL, false)).toBe(1)
  })

  it('1 día solo turno AM (am + am) = 0.5', () => {
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-18'), AM, AM, false)).toBe(0.5)
  })

  it('1 día solo turno PM (pm + pm) = 0.5', () => {
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-18'), PM, PM, false)).toBe(0.5)
  })

  it('1 día en sábado sin aplicaFinDeSemana = 0', () => {
    // 2026-05-16 is a Saturday
    expect(calcularDiasHabilesSync(d('2026-05-16'), d('2026-05-16'), FULL, FULL, false)).toBe(0)
  })

  it('1 día en sábado con aplicaFinDeSemana = 1', () => {
    expect(calcularDiasHabilesSync(d('2026-05-16'), d('2026-05-16'), FULL, FULL, true)).toBe(1)
  })

  // ── Multi-day cases ───────────────────────────────────────────────────────

  it('Lunes a Viernes (5 días hábiles completos) = 5', () => {
    // 2026-05-18 Mon → 2026-05-22 Fri
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), FULL, FULL, false)).toBe(5)
  })

  it('Lunes a Domingo sin aplicaFinDeSemana = 5', () => {
    // 2026-05-18 Mon → 2026-05-24 Sun — weekends excluded
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-24'), FULL, FULL, false)).toBe(5)
  })

  it('Lunes a Domingo con aplicaFinDeSemana = 7', () => {
    // MAT-style: all 7 calendar days count
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-24'), FULL, FULL, true)).toBe(7)
  })

  it('5 días hábiles con 1 feriado intermedio = 4', () => {
    // Mon-Fri, Wednesday is a holiday
    const feriadoSet = new Set(['2026-05-20']) // Wednesday
    expect(
      calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), FULL, FULL, false, feriadoSet),
    ).toBe(4)
  })

  it('turnoInicio=PM → primer día cuenta 0.5', () => {
    // Mon-Fri with PM start: 0.5 + 1 + 1 + 1 + 1 = 4.5
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), PM, FULL, false)).toBe(4.5)
  })

  it('turnoFin=AM → último día cuenta 0.5', () => {
    // Mon-Fri with AM end: 1 + 1 + 1 + 1 + 0.5 = 4.5
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), FULL, AM, false)).toBe(4.5)
  })

  it('turnoInicio=PM y turnoFin=AM = días - 1', () => {
    // Mon-Fri (5 days), PM start and AM end: 0.5 + 1 + 1 + 1 + 0.5 = 4 = 5 - 1
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), PM, AM, false)).toBe(4)
  })

  it('feriado en día de inicio → ese día no cuenta (inicio = 0, resto cuenta)', () => {
    // Mon is holiday, Tue-Fri count
    const feriadoSet = new Set(['2026-05-18'])
    expect(
      calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), FULL, FULL, false, feriadoSet),
    ).toBe(4)
  })

  it('rango de 2 semanas L-V sin feriados = 10', () => {
    // 2026-05-18 to 2026-05-29
    expect(calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-29'), FULL, FULL, false)).toBe(10)
  })
})

// ── Tests that reproduce the UTC-midnight timezone bug ────────────────────────
// Prisma returns @db.Date columns as JS Date at UTC midnight (e.g. 2026-05-18T00:00:00.000Z).
// In UTC-5, setHours(0,0,0,0) shifts this back to May 17 local midnight, treating Monday as Sunday.
// These tests FAIL with the current code and PASS after the normalizeDate / getDay fix.

// Simulates what Prisma returns for a @db.Date column
function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

describe('calcularDiasHabilesSync — fechas UTC midnight (input tipo Prisma @db.Date)', () => {
  it('[UTC] Lunes a Viernes UTC midnight = 5 días hábiles', () => {
    // 2026-05-18 is Monday, 2026-05-22 is Friday — both at UTC midnight as Prisma returns them.
    // Bug: normalizeDate uses setHours(local) → shifts to Sunday May 17 → counts only 4 days.
    expect(
      calcularDiasHabilesSync(utcDate('2026-05-18'), utcDate('2026-05-22'), FULL, FULL, false),
    ).toBe(5)
  })

  it('[UTC] Un lunes UTC midnight es elegible (no es domingo)', () => {
    // 2026-05-18T00:00:00Z is Monday UTC.
    // Bug: getDay() on locally-shifted date returns 0 (Sunday) → same-day returns 0 instead of 1.
    expect(
      calcularDiasHabilesSync(utcDate('2026-05-18'), utcDate('2026-05-18'), FULL, FULL, false),
    ).toBe(1)
  })

  it('[UTC] Resultado idéntico con fecha local o UTC para el mismo día calendario', () => {
    // After fix, both local midnight and UTC midnight for 2026-05-18 must normalize to the same
    // UTC date and produce the same business-day count.
    const resultLocal = calcularDiasHabilesSync(d('2026-05-18'), d('2026-05-22'), FULL, FULL, false)
    const resultUtc   = calcularDiasHabilesSync(utcDate('2026-05-18'), utcDate('2026-05-22'), FULL, FULL, false)
    expect(resultUtc).toBe(resultLocal)
  })
})
