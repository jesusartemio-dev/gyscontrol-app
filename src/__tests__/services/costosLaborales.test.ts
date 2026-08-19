import { calcularCostosLaborales, calcularResumenCostos } from '@/lib/utils/costosLaborales'
import type { Empleado } from '@/types/modelos'

/**
 * Régimen laboral por empleado (Mype 50% gratificación / general 100%) —
 * ver project_piso_planilla.md. GYS es Mype como base, pero los 3 socios
 * están en régimen general. Antes de este campo, TODA la planilla se
 * calculaba como Mype de forma implícita — por eso 'mype' es el default y
 * el caso sin regimenLaboral explícito debe dar exactamente lo mismo que
 * 'mype' explícito (retrocompatibilidad).
 */

function empleado(overrides: Partial<Empleado> = {}): Pick<Empleado, 'sueldoPlanilla' | 'sueldoHonorarios' | 'asignacionFamiliar' | 'emo' | 'regimenLaboral'> {
  return {
    sueldoPlanilla: 3000,
    sueldoHonorarios: 0,
    asignacionFamiliar: 0,
    emo: 25,
    ...overrides,
  }
}

describe('calcularCostosLaborales — régimen laboral', () => {
  it('mype y general dan totales distintos para el mismo sueldo base', () => {
    const mype = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ regimenLaboral: 'general' }))

    expect(general.totalMensual).toBeGreaterThan(mype.totalMensual)
    // Diferencia esperada por la gratificación al 100% en vez de 50%
    // (gratif mensual + bonif extra mensual + CTS sin dividir entre 2).
    expect(general.totalMensual - mype.totalMensual).toBeCloseTo(585, 1)
  })

  it('gratificación: 50% (mype) vs. 100% (general) del sueldo, dos veces al año', () => {
    const mype = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ regimenLaboral: 'general' }))

    expect(mype.gratificacion).toBeCloseTo(3000 * 0.5, 2)
    expect(general.gratificacion).toBeCloseTo(3000 * 1.0, 2)
  })

  it('CTS: mype divide la base entre 2 (media CTS), general no divide (CTS completa)', () => {
    // Sueldo 3000, sin asignación familiar: gratificación mype=1500, general=3000.
    // baseCTS = remuneración + 1/6 gratificación:
    //   mype:    (3000 + 250) / 2 = 1625   (sí divide entre 2)
    //   general: (3000 + 500)     = 3500   (no divide)
    const mype = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ regimenLaboral: 'general' }))

    expect(mype.cts).toBeCloseTo(1625, 2)
    expect(general.cts).toBeCloseTo(3500, 2)
  })

  it('essalud, SCTR y Vida Ley NO cambian por régimen — son aportes sobre el puesto, no sobre el contrato', () => {
    const mype = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ regimenLaboral: 'general' }))

    expect(mype.essalud).toBeCloseTo(general.essalud, 6)
    expect(mype.sctr).toBeCloseTo(general.sctr, 6)
    expect(mype.vidaLey).toBeCloseTo(general.vidaLey, 6)
  })

  it('sin regimenLaboral (undefined) calcula exactamente igual que "mype" explícito — retrocompatibilidad', () => {
    const sinRegimen = calcularCostosLaborales(empleado({ regimenLaboral: undefined }))
    const mypeExplicito = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))

    expect(sinRegimen.totalMensual).toBeCloseTo(mypeExplicito.totalMensual, 6)
    expect(sinRegimen.gratificacion).toBeCloseTo(mypeExplicito.gratificacion, 6)
    expect(sinRegimen.cts).toBeCloseTo(mypeExplicito.cts, 6)
  })

  it('caso real de referencia: S/3000 mype ≈ S/3871.33/mes, general ≈ S/4456.33/mes', () => {
    const mype = calcularCostosLaborales(empleado({ regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ regimenLaboral: 'general' }))

    expect(mype.totalMensual).toBeCloseTo(3871.33, 1)
    expect(general.totalMensual).toBeCloseTo(4456.33, 1)
  })
})

describe('calcularResumenCostos — mezcla de regímenes en la misma planilla', () => {
  it('suma correctamente empleados mype y general en el mismo resumen', () => {
    const resumen = calcularResumenCostos([
      empleado({ sueldoPlanilla: 3000, regimenLaboral: 'mype' }),
      empleado({ sueldoPlanilla: 3000, regimenLaboral: 'general' }),
    ])

    const mype = calcularCostosLaborales(empleado({ sueldoPlanilla: 3000, regimenLaboral: 'mype' }))
    const general = calcularCostosLaborales(empleado({ sueldoPlanilla: 3000, regimenLaboral: 'general' }))

    expect(resumen.totalMensual).toBeCloseTo(mype.totalMensual + general.totalMensual, 2)
    expect(resumen.cantidadEmpleados).toBe(2)
  })
})
