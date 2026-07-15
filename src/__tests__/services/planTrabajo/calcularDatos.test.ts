import { calcularHistogramasYCronograma, calcularTotalHH } from '@/lib/planTrabajo/calcularDatos'
import type { CronogramaContexto } from '@/types/planTrabajo'

type EdtFixture = CronogramaContexto['fases'][number]['edts'][number]

function tarea(overrides: Partial<EdtFixture['actividades'][number]['tareas'][number]> & { fechaInicio: Date; fechaFin: Date; personasEstimadas: number }) {
  return {
    id: `tarea-${Math.random()}`,
    nombre: 'Tarea',
    orden: 0,
    horasEstimadas: null,
    estado: 'pendiente',
    prioridad: 'media',
    ...overrides,
  }
}

function edt(overrides: Partial<EdtFixture> & { nombre: string; fechaInicioPlan: Date; fechaFinPlan: Date; actividades: EdtFixture['actividades'] }): EdtFixture {
  return {
    id: `edt-${overrides.nombre}`,
    edtId: `edt-${overrides.nombre}`,
    orden: 0,
    horasPlan: null,
    estado: 'pendiente',
    prioridad: 'media',
    descripcion: null,
    proyectoFaseId: null,
    responsableId: null,
    ...overrides,
  }
}

describe('calcularHistogramasYCronograma — equipoTrabajo (informe §13, Bug 2)', () => {
  it('el total es el PICO real (Math.max) de personasEstimadas por mes, no la suma de meses activos', () => {
    // Reproduce el caso real reportado: un EDT activo 2 meses, 1 persona cada mes
    // (07:1 · 08:1) — el bug viejo daba total=2 (suma de flags); el real es 1 (pico).
    const procura = edt({
      nombre: 'Procura',
      fechaInicioPlan: new Date('2026-07-01'),
      fechaFinPlan: new Date('2026-08-31'),
      horasPlan: 40,
      actividades: [
        {
          id: 'act-procura', nombre: 'Compras', orden: 0,
          fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-08-31'),
          horasPlan: 40, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [
            tarea({ nombre: 'Solicitud de cotización', fechaInicio: new Date('2026-07-05'), fechaFin: new Date('2026-07-20'), personasEstimadas: 1 }),
            tarea({ nombre: 'Emisión de OC', fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-15'), personasEstimadas: 1 }),
          ],
        },
      ],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [procura] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Procura')!

    expect(fila.valoresPorMes).toEqual([1, 1])
    expect(fila.total).toBe(1) // Math.max(1, 1) — NO 2 (suma vieja)
    expect(fila.total).toBe(Math.max(...fila.valoresPorMes))
  })

  it('usa el pico real de personasEstimadas cuando varía mes a mes (no lo aplana a 0/1)', () => {
    const construccion = edt({
      nombre: 'Construccion',
      fechaInicioPlan: new Date('2026-08-01'),
      fechaFinPlan: new Date('2026-09-30'),
      horasPlan: 200,
      actividades: [
        {
          id: 'act-construccion', nombre: 'Montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'),
          horasPlan: 200, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [
            tarea({ nombre: 'Armado de andamios', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-25'), personasEstimadas: 3 }),
            tarea({ nombre: 'Tendido de cables', fechaInicio: new Date('2026-09-01'), fechaFin: new Date('2026-09-20'), personasEstimadas: 4 }),
          ],
        },
      ],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Construccion')!

    expect(fila.valoresPorMes).toEqual([3, 4])
    expect(fila.total).toBe(4) // pico real, nunca 2 (lo que daría sumar los 2 meses activos)
  })

  it('un mes en que el EDT está activo pero ninguna tarea lo cubre da 0 — nunca hereda/asume 1', () => {
    const gestion = edt({
      nombre: 'Gestion',
      fechaInicioPlan: new Date('2026-07-01'),
      fechaFinPlan: new Date('2026-09-30'), // activo 3 meses...
      horasPlan: 10,
      actividades: [
        {
          id: 'act-gestion', nombre: 'Seguimiento', orden: 0,
          fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-09-30'),
          horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [
            // ...pero la única tarea real con datos solo cubre julio.
            tarea({ nombre: 'Reunión semanal', fechaInicio: new Date('2026-07-01'), fechaFin: new Date('2026-07-10'), personasEstimadas: 1 }),
          ],
        },
      ],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [gestion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Gestion')!

    expect(fila.valoresPorMes).toEqual([1, 0, 0])
    expect(fila.total).toBe(1)
  })

  it('regresión: horasHombre y totalHH NO cambian — siguen siendo la SUMA de horasPlan (informe §4.2)', () => {
    const procura = edt({
      nombre: 'Procura', fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 100,
      actividades: [{ id: 'a1', nombre: 'Compras', orden: 0, fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 100, estado: 'pendiente', prioridad: 'media', descripcion: null, tareas: [] }],
    })
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'), horasPlan: 368,
      actividades: [{ id: 'a2', nombre: 'Montaje', orden: 0, fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'), horasPlan: 368, estado: 'pendiente', prioridad: 'media', descripcion: null, tareas: [] }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [procura, construccion] }])

    const sumaHH = data.histogramas.horasHombre.reduce((s, f) => s + f.total, 0)
    expect(sumaHH).toBe(468) // 100 + 368, sin cambios respecto al comportamiento pre-fix
    expect(data.totalHH).toBe(468)
    expect(calcularTotalHH(data.histogramas)).toBe(468)
    expect(data.cronogramaResumen.filas.reduce((s, f) => s + f.horasPlan, 0)).toBe(468)
  })
})
