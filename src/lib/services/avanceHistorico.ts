import { prisma } from '@/lib/prisma'
import { hh } from './horasHombre'
import { calcularPesosFase } from './pesoFase'

// Serie semanal de avance REAL derivada de ProyectoTareaAvance (el histórico fechado que
// escriben el cierre de jornada y la edición de tareas). Sustituye a los snapshots como
// fuente de la línea "Real": se recalcula en cada consulta, así que cuando se cierra una
// jornada atrasada el avance cae en SU semana y las semanas pasadas se corrigen solas.
//
// La ponderación es la misma de pesoFase.ts / avanceSnapshot.ts (una sola verdad):
//   %global = Σ_tarea  porcentaje(tarea) × pesoTarea(tarea)
//   pesoTarea = pesoEfectivo(fase)/100 × hh(tarea)/horasFase(fase)

const MS_PER_DAY = 86_400_000

/** Lunes (UTC) de la semana ISO a la que pertenece la fecha, como "YYYY-MM-DD". */
function lunesUTC(d: Date): string {
  const dia = d.getUTCDay()
  const delta = dia === 0 ? -6 : 1 - dia
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base + delta * MS_PER_DAY).toISOString().slice(0, 10)
}

export interface PuntoSemanal {
  weekStart: string // lunes UTC "YYYY-MM-DD"
  porcentaje: number // % 0-100
}

export interface SerieAvanceReal {
  puntos: PuntoSemanal[]
  tieneHistorico: boolean
  /** Avance global de HOY con el mismo criterio (lo que muestran cronograma y reportes). */
  porcentajeActual: number
  /** Último valor que alcanza la serie derivada. Si queda muy por debajo de
   *  `porcentajeActual`, es que hay avance sin fila de histórico (falta el punto cero). */
  porcentajeDerivado: number
  tareasConAvance: number
  tareasConHistorico: number
}

const VACIA: SerieAvanceReal = {
  puntos: [],
  tieneHistorico: false,
  porcentajeActual: 0,
  porcentajeDerivado: 0,
  tareasConAvance: 0,
  tareasConHistorico: 0,
}

/**
 * Reconstruye el avance global semana a semana aplicando los asientos del histórico en
 * orden de FECHA DE EFECTO (no de captura). Devuelve un punto por cada semana en la que
 * hubo al menos un asiento; el arrastre entre semanas lo hace `construirCurvaAvance`.
 */
export async function serieAvanceRealSemanal(proyectoId: string): Promise<SerieAvanceReal> {
  const pesos = await calcularPesosFase(proyectoId)
  if (!pesos.cronogramaId) return VACIA

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: pesos.cronogramaId },
    select: {
      id: true,
      horasEstimadas: true,
      personasEstimadas: true,
      porcentajeCompletado: true,
      proyectoEdt: { select: { proyectoFaseId: true } },
    },
  })
  if (tareas.length === 0) return VACIA

  // Peso de cada tarea dentro del % global (mismo reparto que pesoFase.ts: por horas dentro
  // de la fase, y entre fases por pesoEfectivo). Una tarea sin fase no puntúa, igual que allí.
  const infoFase = new Map(pesos.fases.map((f) => [f.faseId, f]))
  const pesoTarea = new Map<string, number>()
  for (const t of tareas) {
    const faseId = t.proyectoEdt?.proyectoFaseId
    const fase = faseId ? infoFase.get(faseId) : undefined
    if (!fase || fase.horasFase <= 0) continue
    pesoTarea.set(t.id, (fase.pesoEfectivo / 100) * (hh(t) / fase.horasFase))
  }

  const avances = await prisma.proyectoTareaAvance.findMany({
    where: { proyectoId, proyectoTareaId: { in: [...pesoTarea.keys()] } },
    orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    select: { proyectoTareaId: true, fecha: true, porcentaje: true },
  })

  // Agrupar por semana para emitir un punto por semana (el estado AL CIERRE de esa semana),
  // no uno por asiento: dos avances el martes y el jueves son un solo punto.
  const porSemana = new Map<string, typeof avances>()
  for (const a of avances) {
    const semana = lunesUTC(a.fecha)
    const lista = porSemana.get(semana)
    if (lista) lista.push(a)
    else porSemana.set(semana, [a])
  }

  const vigente = new Map<string, number>() // tareaId → % vigente
  const puntos: PuntoSemanal[] = []
  for (const semana of [...porSemana.keys()].sort()) {
    for (const a of porSemana.get(semana)!) vigente.set(a.proyectoTareaId, a.porcentaje)
    let global = 0
    for (const [tareaId, pct] of vigente) global += pct * (pesoTarea.get(tareaId) ?? 0)
    puntos.push({ weekStart: semana, porcentaje: Number(global.toFixed(2)) })
  }

  // La cobertura se mide SOLO sobre las tareas que hoy tienen avance: una tarea con
  // histórico pero devuelta a 0% no debe inflar el numerador (daría "66 de 65").
  const conHistorico = new Set(avances.map((a) => a.proyectoTareaId))
  const conAvance = tareas.filter((t) => t.porcentajeCompletado > 0)

  return {
    puntos,
    tieneHistorico: puntos.length > 0,
    porcentajeActual: pesos.avanceGlobal,
    porcentajeDerivado: puntos.length > 0 ? puntos[puntos.length - 1].porcentaje : 0,
    tareasConAvance: conAvance.length,
    tareasConHistorico: conAvance.filter((t) => conHistorico.has(t.id)).length,
  }
}

export interface SerieConsumoHoras {
  puntos: PuntoSemanal[] // % del presupuesto de horas consumido, acumulado
  horasPresupuestadas: number
  horasConsumidas: number
  tieneDatos: boolean
}

/**
 * Serie semanal de CONSUMO de horas: `Σ horas registradas hasta la semana / Σ horas-hombre
 * presupuestadas`.
 *
 * Es deliberadamente una magnitud distinta del avance físico. Puestas una al lado de la otra
 * son la señal de sobrecosto que no existía en ningún reporte: avance 40 % con 80 % de las
 * horas gastadas significa que el trabajo va a costar el doble de lo presupuestado.
 *
 * Las horas se fechan con su `fechaTrabajo`, igual que el avance. Se suman dos fuentes sin
 * solaparlas (mismo criterio que ProgresoService): `RegistroHoras` (timesheet + jornadas ya
 * aprobadas) y los miembros de jornadas cerradas todavía sin aprobar (`registroHorasId` nulo,
 * que aún no se convirtieron en RegistroHoras).
 */
export async function serieConsumoHorasSemanal(proyectoId: string): Promise<SerieConsumoHoras> {
  const VACIO: SerieConsumoHoras = {
    puntos: [], horasPresupuestadas: 0, horasConsumidas: 0, tieneDatos: false,
  }

  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId, tipo: 'ejecucion' },
    select: { id: true },
  })
  if (!cronograma) return VACIO

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: { id: true, horasEstimadas: true, personasEstimadas: true },
  })
  const horasPresupuestadas = tareas.reduce((s, t) => s + hh(t), 0)
  if (horasPresupuestadas <= 0) return VACIO
  const ids = tareas.map((t) => t.id)

  const [registros, miembros] = await Promise.all([
    prisma.registroHoras.findMany({
      where: { proyectoTareaId: { in: ids } },
      select: { fechaTrabajo: true, horasTrabajadas: true },
    }),
    prisma.registroHorasCampoMiembro.findMany({
      where: {
        registroHorasId: null,
        registroCampoTarea: {
          proyectoTareaId: { in: ids },
          // Una jornada abierta no aporta NADA todavía: ni avance ni horas. Es lo que dice
          // el aviso de la pantalla, y es lo que hace horasReales (solo se incrementa al
          // cerrar). Contarlas aquí descuadraba el consumo contra el resto de la app.
          registroCampo: { estado: { not: 'iniciado' } },
        },
      },
      select: {
        horas: true,
        registroCampoTarea: { select: { registroCampo: { select: { fechaTrabajo: true } } } },
      },
    }),
  ])

  const porSemana = new Map<string, number>()
  const suma = (fecha: Date, horas: number) => {
    const k = lunesUTC(fecha)
    porSemana.set(k, (porSemana.get(k) ?? 0) + horas)
  }
  for (const r of registros) suma(r.fechaTrabajo, Number(r.horasTrabajadas) || 0)
  for (const m of miembros) suma(m.registroCampoTarea.registroCampo.fechaTrabajo, m.horas || 0)
  if (porSemana.size === 0) return { ...VACIO, horasPresupuestadas }

  let acum = 0
  const puntos: PuntoSemanal[] = []
  for (const semana of [...porSemana.keys()].sort()) {
    acum += porSemana.get(semana)!
    puntos.push({ weekStart: semana, porcentaje: Number(((acum / horasPresupuestadas) * 100).toFixed(2)) })
  }

  return { puntos, horasPresupuestadas, horasConsumidas: acum, tieneDatos: true }
}
