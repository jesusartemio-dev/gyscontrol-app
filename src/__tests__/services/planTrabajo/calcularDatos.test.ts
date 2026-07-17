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

describe('hhPorActividadConCmn — detalle de HH por actividad, SOLO EDTs de Construcción/Comisionamiento (informe §13.2)', () => {
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

  it('una cuadrilla reparte las horas de la tarea PROPORCIONAL a la cantidad de cada perfil (nunca la suma completa a cada uno)', () => {
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
    expect(series.find(s => s.cargo === 'Supervisor')!.valoresPorActividad).toEqual([10]) // 1/4 de 40
    expect(series.find(s => s.cargo === 'Tecnico')!.valoresPorActividad).toEqual([30]) // 3/4 de 40
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
      expect(advertencias.some(a => a.includes('13.2') && a.includes('1 de 2') && a.includes('50%'))).toBe(true)
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
      expect(advertencias.some(a => a.includes('13.2'))).toBe(false)
    })

    it('sin tareas con recurso en EDTs CON/CMN (nada planificado aún): no hay advertencia de cobertura, solo sección vacía', () => {
      const construccion = edt({
        nombre: 'Construcción', fechaInicioPlan: new Date('2026-08-01'), fechaFinPlan: new Date('2026-08-31'), horasPlan: 0,
        actividades: [actividad({ nombre: 'Montaje', tareas: [] })],
      })

      const { data, advertencias } = calcularHistogramasYCronograma([{ nombre: 'Ejecución', edts: [construccion] }])

      expect(data.histogramas.hhPorActividadConCmn).toEqual({ actividades: [], series: [] })
      expect(advertencias.some(a => a.includes('13.2'))).toBe(false)
    })
  })
})
