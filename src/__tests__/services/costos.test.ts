import {
  calcularCostoRealIndividual,
  calcularCostoRealCuadrillaPorPerfiles,
  getCostoHoraUSD,
} from '@/lib/costos'
import type { Empleado } from '@/types'

/**
 * Informe §13 / docs/analisis-composicion-recursos.md: el costo "RRHH" de una
 * cuadrilla pasa de sumar EMPLEADOS reales (RecursoComposicion, que resultaron
 * ser solo una referencia de costo repetida N veces) a sumar PERFILES
 * (recursos individuales × cantidad, RecursoPerfil) — Σ (costo promedio del
 * perfil × cantidad). `costoHora`/`costoHoraProyecto` (los campos que mueven
 * dinero real en cotizaciones/valorizaciones) NO se tocan — ver el análisis.
 */

const config = { tipoCambio: 3.75, horasMensuales: 208.32 } // valores reales de producción, no los DEFAULTS del código

function empleado(sueldoPlanilla: number, sueldoHonorarios = 0): Empleado {
  return { sueldoPlanilla, sueldoHonorarios } as Empleado
}

describe('calcularCostoRealCuadrillaPorPerfiles', () => {
  it('suma el costo promedio de cada perfil × su cantidad — no el de empleados reales', () => {
    // Perfil "Tecnico": 5 empleados en su pool (referencia de costo, no dotación).
    const perfilTecnico = {
      composiciones: [
        { empleado: empleado(1900) }, // 1900/3.75/208.32 ≈ 2.4321
        { empleado: empleado(1800) }, // ≈ 2.3041
        { empleado: empleado(2426) }, // ≈ 3.1057
        { empleado: empleado(2600) }, // ≈ 3.3282
        { empleado: empleado(2500) }, // ≈ 3.2001
      ],
    }
    // Promedio del pool de Tecnico ≈ 2.8740 — mismo valor confirmado contra producción real (informe §13).
    const costoPromedioTecnico = calcularCostoRealIndividual(perfilTecnico.composiciones, config)
    expect(costoPromedioTecnico).toBeCloseTo(2.874, 2)

    // Cuadrilla 4P = 1 Supervisor + 1 SSOMA + 3× Tecnico.
    const perfiles = [
      { cantidad: 1, recursoMiembro: { composiciones: [{ empleado: empleado(3350, 550) }] } }, // Supervisor ≈ 4.9994... (valor de ejemplo, no crítico)
      { cantidad: 1, recursoMiembro: { composiciones: [{ empleado: empleado(4000) }] } }, // SSOMA
      { cantidad: 3, recursoMiembro: perfilTecnico },
    ]

    const costoReal = calcularCostoRealCuadrillaPorPerfiles(perfiles, config)
    const esperado =
      getCostoHoraUSD(empleado(3350, 550), config) * 1 +
      getCostoHoraUSD(empleado(4000), config) * 1 +
      costoPromedioTecnico * 3

    expect(costoReal).toBeCloseTo(esperado, 6)
    // El costo de "3× Tecnico" es 3 veces el PROMEDIO del perfil, no la suma de 3 empleados puntuales del pool.
    expect(costoReal).toBeCloseTo(esperado, 6)
  })

  it('un perfil sin pool de empleados (recurso individual "externo", ej. Soldador) aporta 0 al costo real, no rompe el cálculo', () => {
    const perfiles = [
      { cantidad: 2, recursoMiembro: { composiciones: [] } }, // ej. "Soldador", origen=externo, sin composición
    ]
    expect(calcularCostoRealCuadrillaPorPerfiles(perfiles, config)).toBe(0)
  })

  it('cuadrilla sin perfiles (recién migrada, aún no recargada por el usuario) da costo real 0', () => {
    expect(calcularCostoRealCuadrillaPorPerfiles([], config)).toBe(0)
  })
})

describe('calcularCostoRealIndividual — regresión (no se toca en esta sesión)', () => {
  it('sigue siendo el promedio simple del pool, ignorando cantidad', () => {
    const composiciones = [{ empleado: empleado(1900) }, { empleado: empleado(1800) }]
    const promedio = calcularCostoRealIndividual(composiciones, config)
    const esperado = (getCostoHoraUSD(empleado(1900), config) + getCostoHoraUSD(empleado(1800), config)) / 2
    expect(promedio).toBeCloseTo(esperado, 6)
  })
})
