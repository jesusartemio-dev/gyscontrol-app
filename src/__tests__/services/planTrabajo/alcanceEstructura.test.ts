import { calcularEstructuraAlcanceDetallado, esEdtDetallado } from '@/lib/planTrabajo/alcanceEstructura'
import {
  mergearDescripcionesEnEstructura,
  descripcionFallbackSubItem,
  preservarEstadoManualTareas,
} from '@/lib/planTrabajo/generarAlcanceDetallado'
import type { CronogramaContexto, PlanPersonal } from '@/types/planTrabajo'

function tarea(nombre: string) {
  return {
    id: `tarea-${nombre}`,
    nombre,
    orden: 0,
    fechaInicio: new Date('2026-02-01'),
    fechaFin: new Date('2026-02-02'),
    horasEstimadas: 8,
    personasEstimadas: 2,
    estado: 'planificado',
    prioridad: 'media',
  }
}

function actividad(id: string, nombre: string, tareas: ReturnType<typeof tarea>[]) {
  return {
    id,
    nombre,
    orden: 0,
    fechaInicioPlan: new Date('2026-02-01'),
    fechaFinPlan: new Date('2026-02-02'),
    horasPlan: 16,
    estado: 'planificado',
    prioridad: 'media',
    descripcion: null,
    tareas,
  }
}

function edt(
  id: string,
  nombre: string,
  actividades: ReturnType<typeof actividad>[]
): CronogramaContexto['fases'][number]['edts'][number] {
  return {
    id,
    nombre,
    edtId: `catalogo-${id}`,
    orden: 0,
    fechaInicioPlan: new Date('2026-02-01'),
    fechaFinPlan: new Date('2026-02-10'),
    horasPlan: 40,
    estado: 'planificado',
    prioridad: 'media',
    descripcion: null,
    proyectoFaseId: null,
    responsableId: null,
    actividades,
  }
}

const cronogramaFixture: NonNullable<CronogramaContexto> = {
  id: 'cron-1',
  tipo: 'planificacion',
  nombre: 'Cronograma de planificación',
  esBaseline: true,
  fases: [
    {
      id: 'fase-planificacion',
      nombre: 'PLANIFICACIÓN',
      orden: 1,
      estado: 'planificado',
      edts: [edt('edt-plan', 'Planificación General', [actividad('act-plan-1', 'Kickoff', [tarea('kickoff')])])],
    },
    {
      id: 'fase-ejecucion',
      nombre: 'EJECUCIÓN',
      orden: 2,
      estado: 'planificado',
      edts: [
        edt('edt-con', 'Construcción', [
          actividad('act-con-1', 'Tendido de cable de fuerza', [tarea('tendido-1')]),
          actividad('act-con-2', 'Montaje de tablero eléctrico', [tarea('montaje-1')]),
          actividad('act-con-3', 'Pruebas eléctricas de continuidad', [tarea('pruebas-1')]),
        ]),
      ],
    },
  ],
}

const personalFixture: PlanPersonal[] = [
  { nombre: 'Roly Segundo', cargo: 'Técnico Operario', siglas: 'RS' },
  { nombre: 'Jesus Mamani', cargo: 'Gestor de Proyecto', siglas: 'JM' },
  { nombre: 'Ana Vera', cargo: 'Ingeniero de Seguridad SSOMA', siglas: 'AV' },
]

describe('esEdtDetallado', () => {
  it('clasifica Construcción en fase EJECUCIÓN como detallado', () => {
    expect(esEdtDetallado('EJECUCIÓN', 'Construcción')).toBe(true)
  })

  it('clasifica Planificación General en fase PLANIFICACIÓN como resumido', () => {
    expect(esEdtDetallado('PLANIFICACIÓN', 'Planificación General')).toBe(false)
  })

  it('NO clasifica un EDT de nombre "Construcción" fuera de la fase EJECUCIÓN como detallado', () => {
    expect(esEdtDetallado('PROCURA', 'Construcción')).toBe(false)
  })
})

describe('calcularEstructuraAlcanceDetallado', () => {
  const { data: estructura, advertencias } = calcularEstructuraAlcanceDetallado(cronogramaFixture, personalFixture)

  it('no genera advertencias con un cronograma válido', () => {
    expect(advertencias).toEqual([])
  })

  it('numera los EDTs de forma secuencial (11.1, 11.2, ...) sin importar la fase', () => {
    expect(estructura.map(e => e.numeracion)).toEqual(['11.1', '11.2'])
  })

  it('clasifica tipoDetalle correctamente por fase + tipo de EDT', () => {
    const [plan, con] = estructura
    expect(plan.tipoDetalle).toBe('resumido')
    expect(con.tipoDetalle).toBe('detallado')
  })

  it('el EDT detallado tiene un subItem por actividad, con numeración incremental ÚNICA', () => {
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    const numeraciones = (con.subItems ?? []).map(s => s.numeracion)
    expect(numeraciones).toEqual(['11.2.1', '11.2.2', '11.2.3'])
    // REGRESIÓN (addendum A): antes todos los subItems salían con la numeración
    // del padre sin incrementar — acá deben ser todas distintas entre sí.
    expect(new Set(numeraciones).size).toBe(numeraciones.length)
  })

  it('el nombre de cada subItem es el nombre REAL de la actividad del cronograma (nunca vacío)', () => {
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    const nombres = (con.subItems ?? []).map(s => s.actividadNombre)
    expect(nombres).toEqual([
      'Tendido de cable de fuerza',
      'Montaje de tablero eléctrico',
      'Pruebas eléctricas de continuidad',
    ])
    for (const n of nombres) expect(n.trim().length).toBeGreaterThan(0)
  })

  it('personalRequerido solo aparece en EDTs detallado, e incluye siempre Supervisor + Seguridad además del pico de personasEstimadas', () => {
    const plan = estructura.find(e => e.edtNombre === 'Planificación General')!
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    expect(plan.personalRequerido).toBeUndefined()
    expect(con.personalRequerido).toEqual([
      { cantidad: 1, cargo: 'Gestor de Proyecto' },
      { cantidad: 1, cargo: 'Ingeniero de Seguridad SSOMA' },
      { cantidad: 2, cargo: 'Técnico Operario' },
    ])
  })

  it('un EDT resumido con una sola actividad no genera subItems', () => {
    const plan = estructura.find(e => e.edtNombre === 'Planificación General')!
    expect(plan.subItems).toEqual([])
  })

  it('un EDT resumido con VARIAS actividades tampoco genera subItems (regla de negocio: solo detallado los tiene)', () => {
    const cronConResumidoMultiple: CronogramaContexto = {
      ...cronogramaFixture,
      fases: [
        {
          ...cronogramaFixture.fases[0],
          edts: [
            edt('edt-procura', 'Procura', [
              actividad('act-proc-1', 'Cotización de cables', [tarea('cotiz-1')]),
              actividad('act-proc-2', 'Orden de compra de tableros', [tarea('oc-1')]),
              actividad('act-proc-3', 'Recepción en almacén', [tarea('recep-1')]),
            ]),
          ],
        },
      ],
    }
    const { data } = calcularEstructuraAlcanceDetallado(cronConResumidoMultiple, personalFixture)
    const procura = data.find(e => e.edtNombre === 'Procura')!
    expect(procura.tipoDetalle).toBe('resumido')
    expect(procura.subItems).toEqual([])
  })
})

describe('mergearDescripcionesEnEstructura', () => {
  const { data: estructura } = calcularEstructuraAlcanceDetallado(cronogramaFixture, personalFixture)
  const con = estructura.find(e => e.edtNombre === 'Construcción')!
  const subItemIds = (con.subItems ?? []).map(s => s.actividadRefId!)

  it('asigna a cada subItem SU PROPIA descripción de IA por id, nunca la del padre ni la de otro subItem', () => {
    const resumidoMapa = new Map<string, string>()
    const detalladoResultados = [
      {
        edtDescripcion: 'Descripción general del EDT de Construcción, redactada por IA.',
        subItems: new Map(subItemIds.map((id, i) => [id, `Descripción específica y distinta de la actividad #${i + 1}.`])),
        tareas: new Map<string, Map<string, string>>(),
        fotosSugeridas: new Map<string, string>(),
        tareasFotosSugeridas: new Map<string, Map<string, string>>(),
        tareasImagenesSugeridas: new Map<string, Map<string, string[]>>(),
      },
    ]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    const descripciones = (conFinal.subItems ?? []).map(s => s.descripcion)

    // Ninguna descripción de subItem debe coincidir con la del EDT padre.
    for (const d of descripciones) expect(d).not.toBe(conFinal.descripcion)

    // REGRESIÓN (addendum A): dos subItems consecutivos nunca deben tener la
    // misma descripción — antes todos heredaban la del EDT padre.
    for (let i = 0; i < descripciones.length - 1; i++) {
      expect(descripciones[i]).not.toBe(descripciones[i + 1])
    }
    expect(new Set(descripciones).size).toBe(descripciones.length)
  })

  it('si la IA no devuelve nada (fallo total), cada subItem cae a un fallback determinista distinto por actividad — nunca vacío ni repetido', () => {
    const resumidoMapa = new Map<string, string>()
    const detalladoResultados = [{
      edtDescripcion: '',
      subItems: new Map<string, string>(),
      tareas: new Map<string, Map<string, string>>(),
      fotosSugeridas: new Map<string, string>(),
      tareasFotosSugeridas: new Map<string, Map<string, string>>(),
      tareasImagenesSugeridas: new Map<string, Map<string, string[]>>(),
    }]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    const descripciones = (conFinal.subItems ?? []).map(s => s.descripcion)

    for (const d of descripciones) expect(d.trim().length).toBeGreaterThan(0)
    expect(new Set(descripciones).size).toBe(descripciones.length)
    expect(descripciones[0]).toBe(descripcionFallbackSubItem('Tendido de cable de fuerza'))
  })
})

describe('tareas por subItem (Bloque 4.2, Tarea 4)', () => {
  const cronConTresTareas: CronogramaContexto = {
    ...cronogramaFixture,
    fases: [
      cronogramaFixture.fases[0],
      {
        ...cronogramaFixture.fases[1],
        edts: [
          edt('edt-con', 'Construcción', [
            actividad('act-con-1', 'Tendido de cable de fuerza', [
              tarea('desenergizar'),
              tarea('delimitar-area'),
              tarea('verificar-tension'),
            ]),
          ]),
        ],
      },
    ],
  }

  it('el subItem detallado incluye las tareas reales del cronograma, con tareaRefId/nombre y texto vacío (la IA lo completa después)', () => {
    const { data } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)
    const con = data.find(e => e.edtNombre === 'Construcción')!
    const sub = con.subItems![0]
    expect(sub.tareas).toHaveLength(3)
    expect(sub.tareas!.map(t => t.nombre)).toEqual(['desenergizar', 'delimitar-area', 'verificar-tension'])
    expect(sub.tareas!.map(t => t.tareaRefId)).toEqual(['tarea-desenergizar', 'tarea-delimitar-area', 'tarea-verificar-tension'])
    for (const t of sub.tareas!) expect(t.texto).toBe('')
  })

  it('un EDT resumido nunca tiene tareas (subItems ya es [])', () => {
    const { data } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)
    const plan = data.find(e => e.edtNombre === 'Planificación General')!
    expect(plan.subItems).toEqual([])
  })

  it('asigna a cada tarea SU PROPIA viñeta de IA por id; si falta, cae al nombre de la tarea (fallback)', () => {
    const { data: estructura } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    const subItemId = con.subItems![0].actividadRefId!
    const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)

    const resumidoMapa = new Map<string, string>()
    const detalladoResultados = [
      {
        edtDescripcion: 'Descripción del EDT.',
        subItems: new Map([[subItemId, 'Descripción del subItem.']]),
        tareas: new Map([
          [
            subItemId,
            new Map([
              [tareaIds[0], 'Desenergizar y bloquear la alimentación mediante dispositivos DAE.'],
              // tareaIds[1] deliberadamente ausente — debe caer al fallback (nombre de la tarea).
              [tareaIds[2], 'Verificar ausencia de tensión con multímetro certificado.'],
            ]),
          ],
        ]),
        fotosSugeridas: new Map([[subItemId, 'Foto del área antes de iniciar el tendido de cable.']]),
        tareasFotosSugeridas: new Map<string, Map<string, string>>(),
        tareasImagenesSugeridas: new Map<string, Map<string, string[]>>(),
      },
    ]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    const textos = conFinal.subItems![0].tareas!.map(t => t.texto)

    expect(textos[0]).toBe('Desenergizar y bloquear la alimentación mediante dispositivos DAE.')
    expect(textos[1]).toBe('delimitar-area')
    expect(textos[2]).toBe('Verificar ausencia de tensión con multímetro certificado.')
    expect(new Set(textos).size).toBe(textos.length)
  })

  it('(Tarea 5) asigna la fotoSugerida de IA a su subItem por id — nunca vacía cuando la IA la devolvió', () => {
    const { data: estructura } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    const subItemId = con.subItems![0].actividadRefId!

    const resumidoMapa = new Map<string, string>()
    const detalladoResultados = [
      {
        edtDescripcion: 'Descripción del EDT.',
        subItems: new Map([[subItemId, 'Descripción del subItem.']]),
        tareas: new Map<string, Map<string, string>>(),
        fotosSugeridas: new Map([[subItemId, 'Foto del área antes de iniciar el tendido de cable.']]),
        tareasFotosSugeridas: new Map<string, Map<string, string>>(),
        tareasImagenesSugeridas: new Map<string, Map<string, string[]>>(),
      },
    ]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    expect(conFinal.subItems![0].fotoSugerida).toBe('Foto del área antes de iniciar el tendido de cable.')
  })

  it('(Tarea 2, sesión 2) asigna la fotoSugerida de IA a CADA TAREA por id — independiente de la fotoSugerida del subItem', () => {
    const { data: estructura } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)
    const con = estructura.find(e => e.edtNombre === 'Construcción')!
    const subItemId = con.subItems![0].actividadRefId!
    const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)

    const resumidoMapa = new Map<string, string>()
    const detalladoResultados = [
      {
        edtDescripcion: 'Descripción del EDT.',
        subItems: new Map([[subItemId, 'Descripción del subItem.']]),
        tareas: new Map<string, Map<string, string>>(),
        fotosSugeridas: new Map<string, string>(),
        tareasFotosSugeridas: new Map([
          [
            subItemId,
            new Map([
              [tareaIds[0], 'Foto del punto de bloqueo antes de intervenir.'],
              // tareaIds[1] deliberadamente ausente — sin fallback obligatorio, cae a ''.
              [tareaIds[2], 'Foto del multímetro marcando 0V.'],
            ]),
          ],
        ]),
        tareasImagenesSugeridas: new Map<string, Map<string, string[]>>(),
      },
    ]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    const fotos = conFinal.subItems![0].tareas!.map(t => t.fotoSugerida)

    expect(fotos[0]).toBe('Foto del punto de bloqueo antes de intervenir.')
    expect(fotos[1]).toBe('')
    expect(fotos[2]).toBe('Foto del multímetro marcando 0V.')
  })

  describe('preservarEstadoManualTareas (Bloque 4.2 sesión 3) — sobrevive a una regeneración', () => {
    const { data: estructuraRecienGenerada } = calcularEstructuraAlcanceDetallado(cronConTresTareas, personalFixture)

    it('una tarea marcada excluida en el estado anterior sigue excluida en la estructura recién regenerada', () => {
      const con = estructuraRecienGenerada.find(e => e.edtNombre === 'Construcción')!
      const subItemId = con.subItems![0].actividadRefId!
      const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)

      const estructuraAnterior = estructuraRecienGenerada.map(edt =>
        edt.edtNombre !== 'Construcción' ? edt : {
          ...edt,
          subItems: edt.subItems!.map(s =>
            s.actividadRefId !== subItemId ? s : {
              ...s,
              tareas: s.tareas!.map(t => t.tareaRefId === tareaIds[1] ? { ...t, excluida: true } : t),
            }
          ),
        }
      )

      const resultado = preservarEstadoManualTareas(estructuraRecienGenerada, estructuraAnterior)
      const conResultado = resultado.find(e => e.edtNombre === 'Construcción')!
      const tareas = conResultado.subItems![0].tareas!

      expect(tareas.find(t => t.tareaRefId === tareaIds[1])!.excluida).toBe(true)
      expect(tareas.find(t => t.tareaRefId === tareaIds[0])!.excluida).toBeFalsy()
      expect(tareas.find(t => t.tareaRefId === tareaIds[2])!.excluida).toBeFalsy()
    })

    it('(Bloque 4.2 sesión 4) las catalogoImagenesRechazadas de una tarea sobreviven a la regeneración', () => {
      const con = estructuraRecienGenerada.find(e => e.edtNombre === 'Construcción')!
      const subItemId = con.subItems![0].actividadRefId!
      const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)

      const estructuraAnterior = estructuraRecienGenerada.map(edt =>
        edt.edtNombre !== 'Construcción' ? edt : {
          ...edt,
          subItems: edt.subItems!.map(s =>
            s.actividadRefId !== subItemId ? s : {
              ...s,
              tareas: s.tareas!.map(t => t.tareaRefId === tareaIds[0] ? { ...t, catalogoImagenesRechazadas: ['cat-roscadora'] } : t),
            }
          ),
        }
      )

      const resultado = preservarEstadoManualTareas(estructuraRecienGenerada, estructuraAnterior)
      const conResultado = resultado.find(e => e.edtNombre === 'Construcción')!
      const tareas = conResultado.subItems![0].tareas!

      expect(tareas.find(t => t.tareaRefId === tareaIds[0])!.catalogoImagenesRechazadas).toEqual(['cat-roscadora'])
      expect(tareas.find(t => t.tareaRefId === tareaIds[1])!.catalogoImagenesRechazadas).toEqual([])
    })

    it('el orden manual del usuario (reordenar viñetas) se reaplica tras regenerar', () => {
      const con = estructuraRecienGenerada.find(e => e.edtNombre === 'Construcción')!
      const subItemId = con.subItems![0].actividadRefId!
      const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)
      // Orden original: [desenergizar, delimitar-area, verificar-tension].
      // El usuario lo reordenó a: [verificar-tension, desenergizar, delimitar-area].
      const ordenManual = [tareaIds[2], tareaIds[0], tareaIds[1]]

      const estructuraAnterior = estructuraRecienGenerada.map(edt =>
        edt.edtNombre !== 'Construcción' ? edt : {
          ...edt,
          subItems: edt.subItems!.map(s =>
            s.actividadRefId !== subItemId ? s : {
              ...s,
              tareas: ordenManual.map(id => s.tareas!.find(t => t.tareaRefId === id)!),
            }
          ),
        }
      )

      const resultado = preservarEstadoManualTareas(estructuraRecienGenerada, estructuraAnterior)
      const conResultado = resultado.find(e => e.edtNombre === 'Construcción')!
      const idsResultado = conResultado.subItems![0].tareas!.map(t => t.tareaRefId)

      expect(idsResultado).toEqual(ordenManual)
    })

    it('una tarea NUEVA en el cronograma (no existía en el estado anterior) se agrega al final, sin excluir', () => {
      const con = estructuraRecienGenerada.find(e => e.edtNombre === 'Construcción')!
      const subItemId = con.subItems![0].actividadRefId!
      const tareaIds = con.subItems![0].tareas!.map(t => t.tareaRefId!)

      // El estado anterior solo tenía 2 de las 3 tareas (ej. la tercera se agregó al cronograma después).
      const estructuraAnterior = estructuraRecienGenerada.map(edt =>
        edt.edtNombre !== 'Construcción' ? edt : {
          ...edt,
          subItems: edt.subItems!.map(s =>
            s.actividadRefId !== subItemId ? s : {
              ...s,
              tareas: s.tareas!.filter(t => t.tareaRefId !== tareaIds[2]),
            }
          ),
        }
      )

      const resultado = preservarEstadoManualTareas(estructuraRecienGenerada, estructuraAnterior)
      const conResultado = resultado.find(e => e.edtNombre === 'Construcción')!
      const idsResultado = conResultado.subItems![0].tareas!.map(t => t.tareaRefId)

      // La tarea nueva (tareaIds[2]) queda al final, y ninguna sale excluida.
      expect(idsResultado).toEqual([tareaIds[0], tareaIds[1], tareaIds[2]])
      expect(conResultado.subItems![0].tareas!.every(t => !t.excluida)).toBe(true)
    })

    it('sin estado anterior para ese subItem, devuelve la estructura nueva sin cambios', () => {
      const resultado = preservarEstadoManualTareas(estructuraRecienGenerada, [])
      expect(resultado).toEqual(estructuraRecienGenerada)
    })
  })
})
