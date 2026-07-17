import { calcularHistogramasYCronograma, calcularTotalHH, calcularMatrizRaci } from '@/lib/planTrabajo/calcularDatos'
import type { CronogramaContexto } from '@/types/planTrabajo'

type PersonaRaciFixture = Parameters<typeof calcularMatrizRaci>[1][number]

function personaRaci(overrides: Partial<PersonaRaciFixture> & { nombre: string; cargo: string; userId: string }): PersonaRaciFixture {
  return { siglas: overrides.nombre.slice(0, 2).toUpperCase(), ...overrides }
}

type EdtFixture = CronogramaContexto['fases'][number]['edts'][number]
type TareaFixture = EdtFixture['actividades'][number]['tareas'][number]
type RecursoFixture = NonNullable<TareaFixture['recurso']>

function recursoIndividual(id: string, nombre: string): RecursoFixture {
  return { id, nombre, tipo: 'individual', perfiles: [] }
}

function recursoCuadrilla(
  id: string,
  nombre: string,
  perfiles: { recursoMiembroNombre: string; cantidad?: number }[]
): RecursoFixture {
  return {
    id,
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
          tarea({ nombre: 'Armado de andamios', fechaInicio: new Date('2026-08-05'), fechaFin: new Date('2026-08-10'), recurso: recursoIndividual('rec-andamiero', 'Andamiero') }),
          tarea({ nombre: 'Desmontaje de andamios', fechaInicio: new Date('2026-08-20'), fechaFin: new Date('2026-08-22'), recurso: recursoIndividual('rec-andamiero', 'Andamiero') }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Andamiero')!

    // 2 tareas del MISMO recursoId el mismo mes -> sigue siendo 1 (misma persona/rol, dedup por recurso.id).
    expect(fila.valoresPorMes).toEqual([1])
    expect(fila.total).toBe(1)
  })

  it('CASO REAL CJM49 — la MISMA cuadrilla citada por 3 tareas concurrentes del mismo mes aporta 4, no 12', () => {
    // Reproduce el caso real: "Cuadrilla 4P" (recursoId único) citada por 3
    // tareas el mismo día/mes en producción. Confirmado por el usuario: es la
    // MISMA gente hciendo 3 tareas secuenciales, no 3 cuadrillas en paralelo.
    const cuadrilla4P = recursoCuadrilla('rec-cuadrilla-4p', 'Cuadrilla 4P', [
      { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
      { recursoMiembroNombre: 'SSOMA', cantidad: 1 },
      { recursoMiembroNombre: 'Tecnico', cantidad: 2 },
    ])

    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 300,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 300, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          tarea({ nombre: 'Elevador - Montaje de soportes y estructuras', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P }),
          tarea({ nombre: 'Elevador - Instalación de bandejas y tuberías', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P }),
          tarea({ nombre: 'Elevador - Tendido de Cables', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    // 1 (Supervisor) + 1 (SSOMA) + 2 (Tecnico) = 4 — NO 12 (3 tareas x 4).
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Supervisor')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'SSOMA')!.total).toBe(1)
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(2)
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
            recurso: recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [
              { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
              { recursoMiembroNombre: 'SSOMA', cantidad: 1 },
              { recursoMiembroNombre: 'Tecnico', cantidad: 2 },
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

  it('2 recursos DISTINTOS (dos cuadrillas distintas) con el mismo perfil, concurrentes, SÍ se suman — son crews reales coexistiendo', () => {
    const cuadrilla2P = recursoCuadrilla('rec-2p', 'Cuadrilla 2P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 2 }])
    const cuadrilla3P = recursoCuadrilla('rec-3p', 'Cuadrilla 3P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 3 }])

    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 200,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: 200, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          // 2 tareas concurrentes el mismo mes, cada una con SU PROPIA cuadrilla (recursoId distinto).
          tarea({ nombre: 'Tarea A (2P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla2P }),
          tarea({ nombre: 'Tarea B (3P)', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla3P }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    // 2 (Cuadrilla 2P) + 3 (Cuadrilla 3P) = 5 — son 2 recursos DISTINTOS, no el mismo citado 2 veces.
    expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(5)
  })

  describe('pico DIARIO, no mensual (informe "el mes es un balde demasiado grueso")', () => {
    it('2 recursos con el mismo cargo, activos en DÍAS DISTINTOS del MISMO mes: el mes da 1, no 2 (el bug exacto de este prompt)', () => {
      // Reproduce SSOMA en CJM49: el SSOMA individual (04-07 ago) y las cuadrillas (28-31 ago)
      // caen en el mismo mes pero NUNCA coinciden un mismo día.
      const ssomaIndividual = recursoIndividual('rec-ssoma', 'SSOMA')
      const cuadrillaConSsoma = recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [{ recursoMiembroNombre: 'SSOMA', cantidad: 1 }])

      const construccion = edt({
        nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 10,
        actividades: [{
          id: 'a1', nombre: 'Seguridad y montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
          horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [
            tarea({ nombre: 'Elaboración de IPERC', fechaInicio: new Date('2026-08-04'), fechaFin: new Date('2026-08-07'), recurso: ssomaIndividual }),
            tarea({ nombre: 'Montaje', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-31'), recurso: cuadrillaConSsoma }),
          ],
        }],
      })

      const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'SSOMA')!.valoresPorMes).toEqual([1])
    })

    it('2 recursos con el mismo cargo, activos el MISMO día: el mes da 2', () => {
      const ssomaIndividual = recursoIndividual('rec-ssoma', 'SSOMA')
      const cuadrillaConSsoma = recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [{ recursoMiembroNombre: 'SSOMA', cantidad: 1 }])

      const construccion = edt({
        nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 10,
        actividades: [{
          id: 'a1', nombre: 'Seguridad y montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
          horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [
            tarea({ nombre: 'Elaboración de IPERC', fechaInicio: new Date('2026-08-04'), fechaFin: new Date('2026-08-28'), recurso: ssomaIndividual }),
            tarea({ nombre: 'Montaje', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-31'), recurso: cuadrillaConSsoma }),
          ],
        }],
      })

      const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'SSOMA')!.valoresPorMes).toEqual([2])
    })

    it('el MISMO recurso citado por 5 tareas del MISMO día aporta UNA sola vez', () => {
      const cuadrilla4P = recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 2 }])
      const construccion = edt({
        nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 10,
        actividades: [{
          id: 'a1', nombre: 'Montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
          horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: Array.from({ length: 5 }, (_, i) =>
            tarea({ nombre: `Tarea ${i}`, fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-08-28'), recurso: cuadrilla4P })
          ),
        }],
      })

      const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(2) // no 10 (5 tareas × 2)
    })

    it('una tarea cuyo rango cruza meses (28/08 a 02/09) cuenta en LOS DOS meses', () => {
      const cuadrilla4P = recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [{ recursoMiembroNombre: 'Tecnico', cantidad: 3 }])
      const construccion = edt({
        nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'), horasPlan: 10,
        actividades: [{
          id: 'a1', nombre: 'Montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'),
          horasPlan: 10, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [tarea({ nombre: 'Montaje cruzando meses', fechaInicio: new Date('2026-08-28'), fechaFin: new Date('2026-09-02'), recurso: cuadrilla4P })],
        }],
      })

      const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.valoresPorMes).toEqual([3, 3])
    })

    it('REGRESIÓN — el pico diario de equipoTrabajo (§13.1) no altera horasHombre/totalHH/cronogramaResumen (§13.2/§13.3/§14, que son SUMAS de HH, no picos)', () => {
      const cuadrilla2p = recursoCuadrilla('rec-2p', 'Cuadrilla 2P', [
        { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
        { recursoMiembroNombre: 'Tecnico', cantidad: 1 },
      ])
      const construccion = edt({
        nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 999,
        actividades: [{
          id: 'a1', nombre: 'Montaje', orden: 0,
          fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
          horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
          tareas: [tarea({ nombre: 'Preparación y Traslado de Material', horasEstimadas: 4, recurso: cuadrilla2p, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-02') })],
        }],
      })

      const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      // equipoTrabajo (§13.1, pico de personas) — SIN CAMBIOS por este fix: 1 Supervisor, 1 Tecnico.
      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Supervisor')!.total).toBe(1)
      expect(data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Tecnico')!.total).toBe(1)
      // horasHombre/totalHH/cronogramaResumen (§13.2/§13.3/§14, SUMA de HH) — el mismo número de siempre: 4h × 2 personas = 8.
      expect(data.totalHH).toBe(8)
      expect(data.histogramas.horasHombre.reduce((s, f) => s + f.total, 0)).toBe(8)
      expect(data.cronogramaResumen.filas.reduce((s, f) => s + f.horasPlan, 0)).toBe(8)
    })
  })

  it('una cuadrilla sin perfiles configurados aporta 0 y emite advertencia — nunca inventa una dotación', () => {
    const cuadrillaVacia = recursoCuadrilla('rec-5p', 'Cuadrilla 5P', [])
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
        tareas: [tarea({ nombre: 'Reunión semanal', fechaInicio: new Date('2026-07-01'), fechaFin: new Date('2026-07-10'), recurso: recursoIndividual('rec-gestor', 'Gestor') })],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [gestion] }])
    const fila = data.histogramas.equipoTrabajo.find(f => f.etiqueta === 'Gestor')!

    expect(fila.valoresPorMes).toEqual([1, 0, 0])
  })

  it('el "TOTAL HH" no son horas-hombre — informe §13: horasHombre/totalHH/cronogramaResumen usan horasEstimadas × personas del recurso EN VIVO, no edt.horasPlan', () => {
    // Caso puntual pedido: una tarea de 4h con Cuadrilla 2P (2 personas) aporta 8 HH, no 4.
    const cuadrilla2p = recursoCuadrilla('rec-2p', 'Cuadrilla 2P', [
      { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
      { recursoMiembroNombre: 'Tecnico', cantidad: 1 },
    ])
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 999, // horasPlan YA NO se usa — valor absurdo a propósito
      actividades: [{
        id: 'a1', nombre: 'Elevador', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Preparación y Traslado de Material', horasEstimadas: 4, recurso: cuadrilla2p, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-02') })],
      }],
    })
    const { data: dataCuadrilla } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])
    expect(dataCuadrilla.histogramas.horasHombre).toEqual([{ etiqueta: 'Construccion', valoresPorMes: [8], total: 8 }])

    // Caso puntual pedido: una tarea de 3h con Andamiero (individual, 1 persona) aporta 3 HH.
    const andamiero = recursoIndividual('rec-and', 'Andamiero')
    const seguridad = edt({
      nombre: 'Seguridad', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 999,
      actividades: [{
        id: 'a2', nombre: 'Andamios', orden: 0,
        fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Armado de Andamios', horasEstimadas: 3, recurso: andamiero, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-02') })],
      }],
    })
    const { data: dataAndamiero } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [seguridad] }])
    expect(dataAndamiero.histogramas.horasHombre).toEqual([{ etiqueta: 'Seguridad', valoresPorMes: [3], total: 3 }])
  })

  it('triple igualdad: totalHH === Σ histogramaHH === Σ cronogramaResumen.horasPlan, con el número real (no la duración cruda)', () => {
    const gestor = recursoIndividual('rec-gestor', 'Gestor')
    const cuadrilla2p = recursoCuadrilla('rec-2p', 'Cuadrilla 2P', [
      { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
      { recursoMiembroNombre: 'Tecnico', cantidad: 1 },
    ])
    const andamiero = recursoIndividual('rec-and', 'Andamiero')

    const procura = edt({
      nombre: 'Procura', fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 100,
      actividades: [{
        id: 'a1', nombre: 'Compras', orden: 0, fechaInicioPlan: new Date('2026-07-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Gestión de compras', horasEstimadas: 100, recurso: gestor, fechaInicio: new Date('2026-07-01'), fechaFin: new Date('2026-08-31') })],
      }],
    })
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'), horasPlan: 368,
      actividades: [{
        id: 'a2', nombre: 'Montaje', orden: 0, fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-09-30'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [
          tarea({ nombre: 'Preparación y Traslado de Material', horasEstimadas: 4, recurso: cuadrilla2p, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-02') }),
          tarea({ nombre: 'Armado de Andamios', horasEstimadas: 3, recurso: andamiero, fechaInicio: new Date('2026-08-02'), fechaFin: new Date('2026-08-03') }),
        ],
      }],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Planificación', edts: [procura, construccion] }])

    // 100 (Gestor, individual) + [4×2 (Cuadrilla 2P) + 3×1 (Andamiero)] = 100 + 11 = 111 — no 100+4+3=107 (duración cruda).
    const totalEsperado = 111
    const sumaHH = data.histogramas.horasHombre.reduce((s, f) => s + f.total, 0)
    expect(sumaHH).toBe(totalEsperado)
    expect(data.totalHH).toBe(totalEsperado)
    expect(calcularTotalHH(data.histogramas)).toBe(totalEsperado)
    expect(data.cronogramaResumen.filas.reduce((s, f) => s + f.horasPlan, 0)).toBe(totalEsperado)
  })

  it('una tarea con horasEstimadas pero SIN recurso asignado aporta 0 (nunca asume 1 persona) y emite advertencia', () => {
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 0,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0, fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Tarea huérfana', horasEstimadas: 40, recurso: null, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
      }],
    })

    const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.totalHH).toBe(0)
    expect(data.histogramas.horasHombre).toEqual([{ etiqueta: 'Construccion', valoresPorMes: [0], total: 0 }])
    expect(advertencias.some(a => a.includes('Tarea huérfana') && a.includes('SIN recurso'))).toBe(true)
  })

  it('CANARIO — calcularHistogramasYCronograma confía en que `fases` viene de UN SOLO cronograma; si el caller concatena planificacion+ejecucion (mismas fases clonadas), el total se DUPLICA', () => {
    // Esta función no sabe qué es un "cronograma" — solo suma lo que le pasan. La protección
    // real contra duplicar 2 cronogramas vive en cargarContexto.ts:129-130
    // (prisma.proyectoCronograma.findFirst({ where: { proyectoId, tipo: 'planificacion' } }) —
    // findFirst devuelve UN solo registro, nunca puede fusionar 2 cronogramas). Este test deja
    // documentado, con un número concreto, qué pasa si esa garantía se rompe — es la trampa real
    // en la que caí al verificar CJM49 a mano (CJM49 tiene cronograma 'planificacion' Y
    // 'ejecucion' con las mismas fases/EDTs/tareas clonadas; mi primer query sin filtrar por
    // proyectoCronogramaId sumó las dos y dio el doble).
    const cuadrilla2p = recursoCuadrilla('rec-2p', 'Cuadrilla 2P', [
      { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
      { recursoMiembroNombre: 'Tecnico', cantidad: 1 },
    ])
    const construccion = edt({
      nombre: 'Construccion', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 0,
      actividades: [{
        id: 'a1', nombre: 'Montaje', orden: 0, fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'),
        horasPlan: null, estado: 'pendiente', prioridad: 'media', descripcion: null,
        tareas: [tarea({ nombre: 'Preparación y Traslado de Material', horasEstimadas: 4, recurso: cuadrilla2p, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-02') })],
      }],
    })

    const { data: unSoloCronograma } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])
    expect(unSoloCronograma.totalHH).toBe(8) // correcto: 4h × 2 personas

    // Simula el error: el mismo EDT (mismo id, misma tarea) aparece 2 veces porque el caller
    // concatenó fases de 2 cronogramas clonados en vez de filtrar por uno solo.
    const { data: dosCronogramasConcatenados } = calcularHistogramasYCronograma([
      { nombre: 'Ejecución', edts: [construccion] },
      { nombre: 'Ejecución (duplicado, simula ejecucion clonada)', edts: [construccion] },
    ])
    expect(dosCronogramasConcatenados.totalHH).toBe(16) // el doble — un número inventado, no real

    // Por eso cargarContexto.ts SIEMPRE debe pasar las fases de un único cronograma
    // (tipo: 'planificacion', vía findFirst) — nunca combinar planificacion + ejecucion.
  })
})

describe('calcularMatrizRaci — todas las filas comparten largo/orden de asignaciones (grilla RACI, plantilla v7)', () => {
  it('cada fila trae exactamente 1 asignación por persona, en el MISMO orden que la lista de personal recibida', () => {
    const personal = [
      personaRaci({ nombre: 'Residente', cargo: 'Residente', userId: 'u1' }),
      personaRaci({ nombre: 'Gerente', cargo: 'Gerente de Proyectos', userId: 'u2' }),
      personaRaci({ nombre: 'Ssoma', cargo: 'Supervisor SSOMA', userId: 'u3' }),
    ]
    const edts = [
      { id: 'e1', nombre: 'Planificación', responsableId: 'u1' },
      { id: 'e2', nombre: 'Construcción', responsableId: null },
    ]

    const { data } = calcularMatrizRaci(edts, personal)

    expect(data.filas).toHaveLength(2)
    for (const fila of data.filas) {
      expect(fila.asignaciones).toHaveLength(personal.length)
      expect(fila.asignaciones.map(a => a.siglas)).toEqual(personal.map(p => p.siglas))
    }
  })

  it('con más de 19 personas, emite una advertencia de Etapa 1 (grilla de la plantilla reserva 1 columna por persona)', () => {
    const personal = Array.from({ length: 20 }, (_, i) =>
      personaRaci({ nombre: `Persona${i}`, cargo: 'Técnico', userId: `u${i}` })
    )
    const { advertencias } = calcularMatrizRaci([{ id: 'e1', nombre: 'Construcción', responsableId: null }], personal)

    expect(advertencias.some(a => a.includes('20') && a.toLowerCase().includes('raci'))).toBe(true)
  })

  it('con 19 personas o menos, NO emite la advertencia de columnas', () => {
    const personal = Array.from({ length: 19 }, (_, i) =>
      personaRaci({ nombre: `Persona${i}`, cargo: 'Técnico', userId: `u${i}` })
    )
    const { advertencias } = calcularMatrizRaci([{ id: 'e1', nombre: 'Construcción', responsableId: null }], personal)

    expect(advertencias.some(a => a.toLowerCase().includes('columnas'))).toBe(false)
  })
})

describe('hhPorActividadConCmn — detalle de HH por actividad, SOLO EDTs de Construcción/Comisionamiento (§13.3)', () => {
  function actividad(overrides: Partial<EdtFixture['actividades'][number]> & { nombre: string; tareas: TareaFixture[] }): EdtFixture['actividades'][number] {
    return {
      id: `act-${overrides.nombre}`,
      orden: 0,
      fechaInicioPlan: new Date('2026-08-01'),
      fechaFinPlan: new Date('2026-08-31'),
      horasPlan: null,
      estado: 'pendiente',
      prioridad: 'media',
      descripcion: null,
      ...overrides,
    }
  }

  it('un EDT de Planificación (gestión) queda AFUERA, aunque tenga tareas con horas y recurso', () => {
    const planificacion = edt({
      nombre: 'Planificación', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [actividad({
        nombre: 'Elaboración de planos',
        tareas: [tarea({ horasEstimadas: 40, recurso: recursoIndividual('rec-cad', 'Cadista'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
      })],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ingeniería', edts: [planificacion] }])

    expect(data.histogramas.hhPorActividadConCmn).toEqual({ actividades: [], series: [] })
  })

  it('un recurso individual en un EDT de Construcción aporta el 100% de las horas de la tarea a su propio cargo', () => {
    const construccion = edt({
      nombre: 'Construcción Eléctrica', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [actividad({
        nombre: 'Montaje de bandejas',
        tareas: [tarea({ horasEstimadas: 40, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
      })],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.hhPorActividadConCmn).toEqual({
      actividades: ['Montaje de bandejas'],
      series: [{ cargo: 'Tecnico', valoresPorActividad: [40] }],
    })
  })

  it('una cuadrilla reparte HH REAL por cargo — cada cargo se lleva horasEstimadas × su propia cantidad (nunca normalizado)', () => {
    const cuadrilla = recursoCuadrilla('rec-4p', 'Cuadrilla 4P', [
      { recursoMiembroNombre: 'Supervisor', cantidad: 1 },
      { recursoMiembroNombre: 'Tecnico', cantidad: 3 },
    ])
    const comisionamiento = edt({
      nombre: 'Comisionamiento', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
      actividades: [actividad({
        nombre: 'Pruebas funcionales',
        tareas: [tarea({ horasEstimadas: 40, recurso: cuadrilla, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
      })],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [comisionamiento] }])

    const series = data.histogramas.hhPorActividadConCmn!.series
    // 40h duración × 1 Supervisor = 40 HH; 40h duración × 3 Tecnico = 120 HH — suma 160 = 40×4 (Σperfiles).
    expect(series.find(s => s.cargo === 'Supervisor')!.valoresPorActividad).toEqual([40])
    expect(series.find(s => s.cargo === 'Tecnico')!.valoresPorActividad).toEqual([120])
  })

  it('2 EDTs distintos (CON y CMN) con una actividad del MISMO nombre suman sus horas bajo una sola etiqueta', () => {
    const construccion = edt({
      nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 20,
      actividades: [actividad({
        nombre: 'Pruebas',
        tareas: [tarea({ horasEstimadas: 20, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-05') })],
      })],
    })
    const comisionamiento = edt({
      nombre: 'Comisionamiento', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 20,
      actividades: [actividad({
        nombre: 'Pruebas',
        tareas: [tarea({ horasEstimadas: 20, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-05') })],
      })],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion, comisionamiento] }])

    expect(data.histogramas.hhPorActividadConCmn).toEqual({
      actividades: ['Pruebas'],
      series: [{ cargo: 'Tecnico', valoresPorActividad: [40] }],
    })
  })

  it('una tarea sin recurso o sin horasEstimadas no aporta nada (nunca inventa un reparto)', () => {
    const construccion = edt({
      nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 0,
      actividades: [actividad({
        nombre: 'Montaje',
        tareas: [
          tarea({ horasEstimadas: null, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-05') }),
          tarea({ horasEstimadas: 40, recurso: null, fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-05') }),
        ],
      })],
    })

    const { data } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

    expect(data.histogramas.hhPorActividadConCmn).toEqual({ actividades: [], series: [] })
  })

  describe('compuerta de cobertura — "sin dato no se rellena" (nunca un gráfico parcial, ver corrección posterior al 23%)', () => {
    it('cobertura PARCIAL (1 de 2 tareas con recurso sin horasEstimadas): la sección ENTERA se omite, no solo la tarea faltante', () => {
      const construccion = edt({
        nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 80,
        actividades: [
          actividad({
            nombre: 'Montaje de bandejas',
            tareas: [tarea({ horasEstimadas: 40, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
          }),
          actividad({
            nombre: 'Tendido de cable',
            // Con recurso asignado pero SIN horasEstimadas cargada — la que dispara la compuerta.
            tareas: [tarea({ horasEstimadas: null, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-11'), fechaFin: new Date('2026-08-20') })],
          }),
        ],
      })

      const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      // Ni siquiera "Montaje de bandejas" (que SÍ tenía sus horas completas) se muestra —
      // la compuerta es sobre la sección completa, no actividad por actividad.
      expect(data.histogramas.hhPorActividadConCmn).toEqual({ actividades: [], series: [] })
      expect(advertencias.some(a => a.includes('13.3') && a.includes('1 de 2') && a.includes('50%'))).toBe(true)
    })

    it('cobertura 100%: el gráfico se genera normalmente y no hay advertencia de cobertura', () => {
      const construccion = edt({
        nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 40,
        actividades: [actividad({
          nombre: 'Montaje de bandejas',
          tareas: [tarea({ horasEstimadas: 40, recurso: recursoIndividual('rec-tec', 'Tecnico'), fechaInicio: new Date('2026-08-01'), fechaFin: new Date('2026-08-10') })],
        })],
      })

      const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.hhPorActividadConCmn).toEqual({
        actividades: ['Montaje de bandejas'],
        series: [{ cargo: 'Tecnico', valoresPorActividad: [40] }],
      })
      expect(advertencias.some(a => a.includes('13.3'))).toBe(false)
    })

    it('sin tareas con recurso en EDTs CON/CMN (nada planificado aún): no hay advertencia de cobertura, solo sección vacía', () => {
      const construccion = edt({
        nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 0,
        actividades: [actividad({ nombre: 'Montaje', tareas: [] })],
      })

      const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.hhPorActividadConCmn).toEqual({ actividades: [], series: [] })
      expect(advertencias.some(a => a.includes('13.3'))).toBe(false)
    })
  })
})
