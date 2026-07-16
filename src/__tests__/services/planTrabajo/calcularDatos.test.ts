import { calcularHistogramasYCronograma, calcularTotalHH } from '@/lib/planTrabajo/calcularDatos'
import type { CronogramaContexto } from '@/types/planTrabajo'

type EdtFixture = CronogramaContexto['fases'][number]['edts'][number]
type TareaFixture = EdtFixture['actividades'][number]['tareas'][number]
type RecursoFixture = NonNullable<TareaFixture['recurso']>

function recursoIndividual(nombre: string): RecursoFixture {
  return { nombre, tipo: 'individual', composiciones: [] }
}

function recursoCuadrilla(
  nombre: string,
  miembros: { empleadoId: string; cargoNombre: string | null; cantidad?: number }[]
): RecursoFixture {
  return {
    nombre,
    tipo: 'cuadrilla',
    composiciones: miembros.map(m => ({ empleadoId: m.empleadoId, cantidad: m.cantidad ?? 1, cargoNombre: m.cargoNombre })),
  }
}

function tarea(overrides: Partial<TareaFixture> & { fechaInicio: Date; fechaFin: Date; recurso: RecursoFixture | null }): TareaFixture {
  return {
    id: `tarea-${Math.random()}`,
    nombre: 'Tarea',
    orden: 0,
    horasEstimadas: null,
    personasEstimadas: 1, // informe §13 Bug 3: este campo YA NO es la fuente de equipoTrabajo — se deja en 1 (default) a propósito para que un test que lo mire por error falle.
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

describe('calcularHistogramasYCronograma — equipoTrabajo por CARGO (informe §13, Bug 3)', () => {
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

  it('una cuadrilla (ej. "Cuadrilla 4P") se descompone en sus 4 miembros reales por Cargo, no en una fila "Cuadrilla 4P"', () => {
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
              { empleadoId: 'emp-1', cargoNombre: 'INGENIERO SEMI SENIOR B DE CONSTRUCCIÓN' },
              { empleadoId: 'emp-2', cargoNombre: 'INGENIERO DE SEGURIDAD' },
              { empleadoId: 'emp-3', cargoNombre: 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN' },
              { empleadoId: 'emp-4', cargoNombre: 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN' },
            ]),
          }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Cuadrilla 4P')).toBeUndefined() // no existe una fila "Cuadrilla 4P"
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'INGENIERO SEMI SENIOR B DE CONSTRUCCIÓN')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'INGENIERO DE SEGURIDAD')!.total).toBe(1)
    // emp-3 y emp-4 comparten el mismo Cargo.nombre -> son 2 personas distintas, la fila suma 2 (no dedup, son empleadoId distintos).
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN')!.total).toBe(2)
  })

  it('dedup por empleadoId: la MISMA persona en 2 cuadrillas concurrentes el mismo mes NO se cuenta dos veces', () => {
    const cuadrilla2P = recursoCuadrilla('Cuadrilla 2P', [
      { empleadoId: 'emp-angel', cargoNombre: 'INGENIERO SEMI SENIOR B DE CONSTRUCCIÓN' },
      { empleadoId: 'emp-yony', cargoNombre: 'INGENIERO DE SEGURIDAD' },
    ])
    const cuadrilla4P = recursoCuadrilla('Cuadrilla 4P', [
      { empleadoId: 'emp-angel', cargoNombre: 'INGENIERO SEMI SENIOR B DE CONSTRUCCIÓN' }, // mismo empleado que en 2P
      { empleadoId: 'emp-yony', cargoNombre: 'INGENIERO DE SEGURIDAD' }, // idem
      { empleadoId: 'emp-roly', cargoNombre: 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN' },
      { empleadoId: 'emp-nelson', cargoNombre: 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN' },
    ])

    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 200,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 200, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          // 3 tareas concurrentes el mismo mes, usando cuadrillas que comparten personas (caso real CJM49: 28/08).
          tarea({ nombre: 'Tarea A (2P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla2P }),
          tarea({ nombre: 'Tarea B (4P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P }),
          tarea({ nombre: 'Tarea C (4P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    // emp-angel aparece en 3 aportes (2P, 4P x2) el mismo mes -> deduplicado a 1.
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'INGENIERO SEMI SENIOR B DE CONSTRUCCIÓN')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'INGENIERO DE SEGURIDAD')!.total).toBe(1)
    // emp-roly y emp-nelson (2 personas reales, ambas solo en 4P, citada 2 veces el mismo mes) -> 2, no 4.
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'TÉCNICO SEMI SENIOR B DE CONSTRUCCIÓN')!.total).toBe(2)
  })

  it('un miembro de cuadrilla sin Cargo asignado se descarta (nunca se inventa un cargo) y se advierte', () => {
    const cuadrillaConHueco = recursoCuadrilla('Cuadrilla X', [
      { empleadoId: 'emp-1', cargoNombre: 'INGENIERO DE SEGURIDAD' },
      { empleadoId: 'emp-sin-cargo', cargoNombre: null },
    ])
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 40, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Tarea', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-10'), recurso: cuadrillaConHueco })],
      }],
    })

    const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'INGENIERO DE SEGURIDAD')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.some(f => f.etiqueta === 'null' || f.etiqueta === '')).toBe(false)
    expect(advertencias.some(a => a.includes('emp-sin-cargo') && a.includes('sin Cargo'))).toBe(true)
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
