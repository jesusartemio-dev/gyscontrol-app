import { calcularHistogramasYCronograma, calcularTotalHH } from '@/lib/planTrabajo/calcularDatos'
import type { CronogramaContexto } from '@/types/planTrabajo'

type EdtFixture = CronogramaContexto['fases'][number]['edts'][number]
type TareaFixture = EdtFixture['actividades'][number]['tareas'][number]
type RecursoFixture = NonNullable<TareaFixture['recurso']>

function recursoIndividual(nombre: string): RecursoFixture {
  return { nombre, tipo: 'individual', perfiles: [] }
}

function recursoCuadrilla(
  nombre: string,
  perfiles: { recursoMiembroNombre: string; cantidad?: number }[]
): RecursoFixture {
  return {
    nombre,
    tipo: 'cuadrilla',
    perfiles: perfiles.map(p => ({ recursoMiembroNombre: p.recursoMiembroNombre, cantidad: p.cantidad ?? 1 })),
  }
}

function tarea(overrides: Partial<TareaFixture> & { fechaInicio: Date; fechaFin: Date; recurso: RecursoFixture | null }): TareaFixture {
  return {
    id: `tarea-${Math.random()}`,
    nombre: 'Tarea',
    orden: 0,
    horasEstimadas: null,
    personasEstimadas: 1, // informe §13: este campo YA NO es la fuente de equipoTrabajo — se deja en 1 (default) a propósito para que un test que lo mire por error falle.
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

describe('calcularHistogramasYCronograma — equipoTrabajo por CARGO real (informe §13, Bug 3 + docs/analisis-composicion-recursos.md)', () => {
  it('un recurso individual (ej. Andamiero) aporta SIEMPRE 1 a su propio cargo, sin resolver a un empleado puntual', () => {
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 40, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          tarea({ nombre: 'Armado de andamios', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-10'), recurso: recursoIndividual('Andamiero') }),
          tarea({ nombre: 'Desmontaje de andamios', fechaInicio: new Date('2026-08-20'), fechaFin: new Date('2026-08-22'), recurso: recursoIndividual('Andamiero') }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Andamiero')!

    // 2 tareas de Andamiero el mismo mes -> sigue siendo 1 (mismo cargo individual, no se suma por tarea).
    expect(fila.valoresPorMes).toEqual([1])
    expect(fila.total).toBe(1)
  })

  it('una cuadrilla (ej. "Cuadrilla 4P") se descompone en sus perfiles reales, no en una fila "Cuadrilla 4P"', () => {
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 100,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 100, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          tarea({
            nombre: 'Montaje de soportes', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-10'),
            recurso: recursoCuadrilla('Cuadrilla 4P', [
              { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
              { recursoMiembroNombre: 'SSOMA', cantidad: 1 },
              { recursoMiembroNombre: 'Tecnico', cantidad: 2 }, // "3× Tecnico" ya no son 3 filas de empleado, es 1 perfil con cantidad
            ]),
          }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Cuadrilla 4P')).toBeUndefined() // no existe una fila "Cuadrilla 4P"
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Supervisor')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'SSOMA')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(2)
  })

  it('2 tareas concurrentes del mismo perfil SUMAN (ya no se deduplica por empleado — no hay empleado en el camino)', () => {
    const cuadrilla2P = recursoCuadrilla('Cuadrilla 2P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 2 }])
    const cuadrilla3P = recursoCuadrilla('Cuadrilla 3P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 3 }])

    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 200,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 200, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          // 2 tareas concurrentes el mismo mes, cada una con su propia cuadrilla de "Tecnico".
          tarea({ nombre: 'Tarea A (2P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla2P }),
          tarea({ nombre: 'Tarea B (3P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla3P }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    // 2 (de Cuadrilla 2P) + 3 (de Cuadrilla 3P) = 5 — es una declaración de dotación real, no una coincidencia a evitar.
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(5)
  })

  it('una cuadrilla sin perfiles configurados aporta 0 y emite advertencia — nunca inventa una dotación', () => {
    const cuadrillaVacia = recursoCuadrilla('Cuadrilla 5P', [])
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 40, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Tarea', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-10'), recurso: cuadrillaVacia })],
      }],
    })

    const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.equipoTrabajo).toEqual([])
    expect(advertencias.some(a => a.includes('Cuadrilla 5P') && a.includes('sin perfiles'))).toBe(true)
  })

  it('un mes en que el EDT está activo pero ninguna tarea con recurso lo cubre da 0 para ese cargo — nunca hereda/asume 1', () => {
    const gestion = edt({
      nombre: 'Gestion', fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-09-30'), horasPlan: 10,
      actividades: [{
        id: 'a1', nombre: 'Seguimiento', orden: 0,
        fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-09-30'),
        horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Reunión semanal', fechaInicio: new Date('2026-07-01'), fechaFin: new Date('2026-07-10'), recurso: recursoIndividual('Gestor') })],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [gestion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Gestor')!

    expect(fila.valoresPorMes).toEqual([1, 0, 0])
  })

  it('regresión: horasHombre y totalHH NO cambian — siguen siendo la SUMA de horasPlan por EDT (informe §4.2)', () => {
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
    expect(sumaHH).toBe(468)
    expect(data.totalHH).toBe(468)
    expect(calcularTotalHH(data.histogramas)).toBe(468)
    expect(data.cronogramaResumen.filas.reduce((s, f) => s + f.horasPlan, 0)).toBe(468)
    // equipoTrabajo queda vacío (sin tareas con recurso) — no rellena nada por default.
    expect(data.histogramas.equipoTrabajo).toEqual([])
  })
})
