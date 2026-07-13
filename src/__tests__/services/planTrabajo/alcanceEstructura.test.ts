import { calcularEstructuraAlcanceDetallado, esEdtDetallado } from '@/lib/planTrabajo/alcanceEstructura'
import {
  mergearDescripcionesEnEstructura,
  descripcionFallbackSubItem,
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
    const detalladoResultados = [{ edtDescripcion: '', subItems: new Map<string, string>() }]

    const final = mergearDescripcionesEnEstructura(estructura, resumidoMapa, detalladoResultados)
    const conFinal = final.find(e => e.edtNombre === 'Construcción')!
    const descripciones = (conFinal.subItems ?? []).map(s => s.descripcion)

    for (const d of descripciones) expect(d.trim().length).toBeGreaterThan(0)
    expect(new Set(descripciones).size).toBe(descripciones.length)
    expect(descripciones[0]).toBe(descripcionFallbackSubItem('Tendido de cable de fuerza'))
  })
})
