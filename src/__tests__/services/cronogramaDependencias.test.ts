import { fechasPorPredecesoras, horasIncumplidas } from '@/lib/services/cronogramaDependencias'
import { horasLaborablesEntre, type CalendarioHoras } from '@/lib/services/cronogramaHoras'

// Calendario GYS: L–V, 08:00–12:00 y 13:00–18:30 (9.5 h).
const cal = {
  horasPorDia: 9.5,
  diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '18:30',
  diaCalendario: [], excepcionCalendario: [],
} as unknown as CalendarioHoras

const d = (s: string) => new Date(`${s}Z`)

describe('fechasPorPredecesoras — manda la más exigente', () => {
  // Una predecesora termina el lunes 26/10 (5 días) y otra el viernes 30/10 (10 días).
  const corta = { tipo: 'finish_to_start', lagMinutos: 0, pred: { inicio: d('2026-10-20T08:00'), fin: d('2026-10-26T18:30') } }
  const larga = { tipo: 'finish_to_start', lagMinutos: 0, pred: { inicio: d('2026-10-20T08:00'), fin: d('2026-10-30T18:30') } }
  const dur = 9.5

  it('ubica la tarea tras la que termina más tarde, sin importar el orden', () => {
    for (const deps of [[corta, larga], [larga, corta]]) {
      const r = fechasPorPredecesoras(cal, deps, dur)
      expect(r.inicio.toISOString()).toBe('2026-11-02T08:00:00.000Z') // lunes siguiente al 30/10
      expect(horasLaborablesEntre(cal, r.inicio, r.fin)).toBe(dur)
      expect(deps[r.determinante]).toBe(larga)
    }
  })

  it('con esas fechas se cumplen TODAS (ajustar a la corta dejaba en rojo a la larga)', () => {
    const r = fechasPorPredecesoras(cal, [corta, larga], dur)
    for (const dep of [corta, larga]) expect(horasIncumplidas(cal, dep, dep.pred, r)).toBe(0)
    const soloCorta = fechasPorPredecesoras(cal, [corta], dur)
    expect(horasIncumplidas(cal, larga, larga.pred, soloCorta)).toBeGreaterThan(0)
  })
})
