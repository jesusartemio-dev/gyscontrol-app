import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { calcularResidual, normalizarControl } from '@/lib/iperc/riesgoResidual'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage, calculateCost } from '@/lib/agente/usageTracker'
import { adquirirLock, completarLock, fallarLock } from '@/lib/iperc/mutex'
import { RESUMIR_PLAN_TRABAJO_IPERC_PROMPT } from '@/lib/iperc/prompts/resumirPlanTrabajo'
import {
  GENERAR_LOTE_IPERC_SYSTEM,
  buildPromptLote,
  type TareaParaIperc,
} from '@/lib/iperc/prompts/generarLoteIperc'
import { validarYParsearLote, type FilaIpercIa } from '@/lib/iperc/validarFilas'
import { obtenerAlcanceParaContexto } from '@/lib/planTrabajo/obtenerAlcanceParaContexto'

const MAX_FILAS = 200
const PARALELISMO = 3 // llamadas concurrentes a Anthropic

// Sonnet: calidad para EJECUCIÓN, paralelismo 3 compensa la lentitud (3×140s → 140s total)
// Haiku: fases administrativas (INGENIERÍA, PROCURA), rápido y barato
const CFG_ALTO_RIESGO = { tamLote: 10, maxTokens: 16000 }
const CFG_NORMAL = { tamLote: 15, maxTokens: 8192 }

const REGEX_ALTO_RIESGO = /ejecuci|montaje|obra|instalaci|construcci|comisionamiento/i

function esFaseAltoRiesgo(nombre: string): boolean {
  const n = nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return REGEX_ALTO_RIESGO.test(n)
}

// ─── Semáforo para concurrencia ─────────────────────────────────────────────

class Semaphore {
  private queue: Array<() => void> = []
  private count: number

  constructor(limit: number) { this.count = limit }

  acquire(): Promise<void> {
    if (this.count > 0) { this.count--; return Promise.resolve() }
    return new Promise(resolve => this.queue.push(resolve))
  }

  release(): void {
    if (this.queue.length > 0) this.queue.shift()!()
    else this.count++
  }
}

// ─── Mutex para escrituras DB seriales ──────────────────────────────────────

class Mutex {
  private queue: Array<() => void> = []
  private locked = false

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true
      return this.doRelease.bind(this)
    }
    return new Promise(resolve => {
      this.queue.push(() => resolve(this.doRelease.bind(this)))
    })
  }

  private doRelease(): void {
    if (this.queue.length > 0) this.queue.shift()!()
    else this.locked = false
  }
}

type SendFn = (event: string, data: unknown) => void

// ─── Carga de contexto ──────────────────────────────────────────────────────

/**
 * @param soloTareaIds Cuando viene, limita la generación a esas tareas (un
 * bloque). El resto del contexto sigue siendo el de los EDTs completos: la IA
 * necesita ver el proyecto entero para evaluar bien, aunque solo escriba un
 * tramo.
 */
async function cargarContexto(proyectoId: string, edtIds: string[], soloTareaIds?: string[]) {
  const [proyecto, iperc, cronograma] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, codigo: true },
    }),
    prisma.iperc.findUnique({
      where: { proyectoId },
      select: { id: true },
    }),
    prisma.proyectoCronograma.findUnique({
      where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
      select: { id: true },
    }),
  ])

  if (!proyecto || !iperc || !cronograma) return null

  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: { id: true, nombre: true, orden: true },
    orderBy: { orden: 'asc' },
  })

  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId: cronograma.id, id: { in: edtIds } },
    select: { id: true, nombre: true, orden: true, proyectoFaseId: true },
    orderBy: { orden: 'asc' },
  })

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoCronogramaId: cronograma.id, proyectoEdtId: { in: edtIds } },
    select: { id: true, nombre: true, orden: true, proyectoEdtId: true },
    orderBy: { orden: 'asc' },
  })

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id, proyectoEdtId: { in: edtIds } },
    select: {
      id: true,
      nombre: true,
      orden: true,
      proyectoEdtId: true,
      proyectoActividadId: true,
      horasEstimadas: true,
      personasEstimadas: true,
    },
    // Se ordena abajo, en JS: aquí no se puede. Ordenar por `proyectoEdtId`
    // era ordenar por cuid, o sea al azar — por eso el IPERC salía con
    // Comisionamiento antes que Construcción.
  })

  const faseMap = new Map(fases.map(f => [f.id, f]))
  const edtMap = new Map(edts.map(e => [e.id, e]))
  const actMap = new Map(actividades.map(a => [a.id, a.nombre]))
  const actOrdenMap = new Map(actividades.map(a => [a.id, a.orden]))

  // Orden del cronograma: fase → EDT → actividad → tarea. Es el orden en que
  // se va a ejecutar la obra y el que el supervisor espera leer en el IPERC.
  const ordenTarea = (t: (typeof tareas)[number]) => {
    const edt = edtMap.get(t.proyectoEdtId)
    const fase = edt?.proyectoFaseId ? faseMap.get(edt.proyectoFaseId) : null
    return [
      fase?.orden ?? 9999,
      edt?.orden ?? 9999,
      t.proyectoActividadId ? (actOrdenMap.get(t.proyectoActividadId) ?? 9999) : 9999,
      t.orden ?? 9999,
    ]
  }
  tareas.sort((a, b) => {
    const oa = ordenTarea(a)
    const ob = ordenTarea(b)
    for (let i = 0; i < oa.length; i++) {
      if (oa[i] !== ob[i]) return oa[i] - ob[i]
    }
    return a.nombre.localeCompare(b.nombre)
  })
  const tareasDelBloque = soloTareaIds?.length
    ? tareas.filter(t => soloTareaIds.includes(t.id))
    : tareas

  const tareasParaIperc: TareaParaIperc[] = tareasDelBloque.map(t => {
    const edt = edtMap.get(t.proyectoEdtId)
    const fase = edt?.proyectoFaseId ? faseMap.get(edt.proyectoFaseId) : null
    const edtNombre = edt?.nombre ?? 'General'
    const faseNombre = fase?.nombre ?? 'EJECUCIÓN'
    const esAltoRiesgo = esFaseAltoRiesgo(faseNombre)
    const actNombre = t.proyectoActividadId ? (actMap.get(t.proyectoActividadId) ?? edtNombre) : edtNombre
    return {
      tareaId: t.id,
      actividadId: t.proyectoActividadId ?? null,
      proceso: edtNombre,
      edt: edtNombre,
      faseNombre,
      esAltoRiesgo,
      actividad: actNombre,
      tarea: t.nombre,
      horasEstimadas: t.horasEstimadas ? Number(t.horasEstimadas) : null,
      personasEstimadas: t.personasEstimadas,
    }
  })

  const edtsNombres = edts.map(e => e.nombre)

  const contextoTexto = `
PROYECTO: ${proyecto.nombre} (${proyecto.codigo ?? 'sin código'})
EDTs SELECCIONADOS PARA IPERC: ${edtsNombres.join(', ')}
TOTAL TAREAS A EVALUAR EN ESTE BLOQUE: ${tareasDelBloque.length}

${fases.map(fase => {
    const edtsDeFase = edts.filter(e => e.proyectoFaseId === fase.id)
    if (edtsDeFase.length === 0) return null
    return `## FASE: ${fase.nombre}\n${edtsDeFase.map(edt => {
      const actsDEdt = actividades.filter(a => a.proyectoEdtId === edt.id)
      const tareasSinAct = tareas.filter(t => t.proyectoEdtId === edt.id && !t.proyectoActividadId)
      return `  EDT: ${edt.nombre}\n${actsDEdt.map(act => {
        const tareasDEAct = tareas.filter(t => t.proyectoActividadId === act.id)
        return `    Actividad: ${act.nombre}\n${tareasDEAct.map(t =>
          `      - ${t.nombre} | ${t.horasEstimadas ?? '?'}h | ${t.personasEstimadas} pers | id=${t.id}`
        ).join('\n')}`
      }).join('\n')}${tareasSinAct.length > 0 ? '\n' + tareasSinAct.map(t =>
        `    - ${t.nombre} | ${t.horasEstimadas ?? '?'}h | ${t.personasEstimadas} pers | id=${t.id}`
      ).join('\n') : ''}`
    }).join('\n')}`
  }).filter(Boolean).join('\n\n')}
  `.trim()

  // Contexto rico del Plan de Trabajo (V2 revisado si existe, si no el
  // estructurado) — el cronograma sigue siendo el esqueleto/grano de las
  // filas; esto solo enriquece la identificación de peligros con el método
  // real descrito (EPP, herramientas, condiciones). Ver
  // obtenerAlcanceParaContexto.ts. Nunca bloquea: '' si no hay nada.
  const alcancePlanTrabajo = await obtenerAlcanceParaContexto(proyectoId)
  const contextoCompleto = alcancePlanTrabajo
    ? `${contextoTexto}\n\n## ALCANCE DEL PLAN DE TRABAJO (método de trabajo real)\n${alcancePlanTrabajo}`
    : contextoTexto

  return { iperc, tareasParaIperc, contextoTexto: contextoCompleto, edtsNombres }
}

// ─── Resumen ────────────────────────────────────────────────────────────────

async function resumir(
  contextoTexto: string,
  userId: string,
  proyectoId: string,
  signal?: AbortSignal,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()
  const modelo = getModelForTask('chat-simple')

  const resp = await anthropic.messages.create({
    model: modelo,
    max_tokens: 4000,
    temperature: 0.3,
    system: RESUMIR_PLAN_TRABAJO_IPERC_PROMPT,
    messages: [{ role: 'user', content: `CONTEXTO DEL PROYECTO:\n\n${contextoTexto}\n\nGenera el resumen SSOMA para IPERC.` }],
  }, { signal })

  trackUsage({
    userId,
    tipo: 'iperc.resumen',
    modelo,
    tokensInput: resp.usage.input_tokens,
    tokensOutput: resp.usage.output_tokens,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId },
  })

  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

// ─── Generación de un lote ───────────────────────────────────────────────────

async function generarLote(
  resumenProyecto: string,
  tareas: TareaParaIperc[],
  modelo: string,
  maxTokens: number,
  userId: string,
  proyectoId: string,
  loteIndex: number,
  signal?: AbortSignal,
): Promise<FilaIpercIa[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 4 })
  const inicio = Date.now()

  // Sin resumenPrevias en modo paralelo (los lotes corren simultáneamente)
  const userMessage = buildPromptLote(resumenProyecto, tareas, '')

  const resp = await (anthropic.messages.create as any)({
    model: modelo,
    max_tokens: maxTokens,
    temperature: 0.2,
    system: [
      {
        type: 'text',
        text: GENERAR_LOTE_IPERC_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  }, { signal }) as Anthropic.Message

  const usageRaw = resp.usage as unknown as Record<string, number>
  trackUsage({
    userId,
    tipo: 'iperc.lote',
    modelo,
    tokensInput: resp.usage.input_tokens,
    tokensOutput: resp.usage.output_tokens,
    tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
    tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId, lote: loteIndex },
  })

  const texto = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const { filasValidas, errores } = validarYParsearLote(texto)
  if (errores.length > 0) {
    console.warn(`[iperc.generar] Lote ${loteIndex}: ${errores.length} filas con error — ${errores.slice(0, 3).join('; ')}`)
  }

  return filasValidas
}

// ─── Procesamiento paralelo ──────────────────────────────────────────────────

interface LoteParalelo {
  idx: number
  tareas: TareaParaIperc[]
  modelo: string
  maxTokens: number
}

async function procesarEnParalelo(
  lotes: LoteParalelo[],
  resumenProyecto: string,
  ipercId: string,
  userId: string,
  proyectoId: string,
  send: SendFn,
  signal?: AbortSignal,
  /**
   * Desde que numero empezar. Al generar un bloque ya hay filas de otros
   * bloques: arrancar siempre en 1 dejaria numeros duplicados hasta la
   * renumeracion final, y si la corrida falla, duplicados permanentes.
   */
  numeroBase = 0,
): Promise<{ filasGuardadas: number; lotesFallidos: number; lotesConSonnet: number; lotesConHaiku: number }> {
  const totalLotes = lotes.length
  const modeloSonnet = getModelForTask('ssoma-iperc')

  let filasGuardadas = 0
  let lotesTerminados = 0
  let lotesFallidos = 0
  let lotesConSonnet = 0
  let lotesConHaiku = 0

  // Mutex garantiza escrituras DB seriales → número secuencial sin colisiones
  const mutex = new Mutex()

  const saveFilas = async (filas: FilaIpercIa[]): Promise<unknown[]> => {
    const release = await mutex.acquire()
    try {
      if (filasGuardadas >= MAX_FILAS || filas.length === 0) return []
      const rows = filas.slice(0, MAX_FILAS - filasGuardadas)
      const startNum = numeroBase + filasGuardadas + 1
      const insertadas = await prisma.$transaction(
        rows.map((fila, i) =>
          prisma.ipercFila.create({
            data: {
              ipercId,
              numero: startNum + i,
              proceso: fila.proceso,
              actividad: fila.actividad,
              tarea: fila.tarea,
              puestoTrabajo: fila.puestoTrabajo,
              factorRiesgo: fila.factorRiesgo,
              condicionActividad: fila.condicionActividad,
              peligro: fila.peligro,
              riesgo: fila.riesgo,
              consecuencia: fila.consecuencia,
              severidad: fila.severidad,
              probabilidad: fila.probabilidad,
              eliminar: fila.eliminar,
              sustituir: fila.sustituir,
              // Los controles se guardan como lista, un item por linea.
              controlIngenieria: normalizarControl(fila.controlIngenieria),
              controlAdministrativo: normalizarControl(fila.controlAdministrativo),
              controlReceptor: normalizarControl(fila.controlReceptor),
              // El residual NO es lo que devolvio la IA: sale de la regla del
              // SSOMA (ingenieria sube la severidad, administrativo la
              // probabilidad). La IA incumplia la regla en 101 de 150 filas.
              ...calcularResidual(
                fila.severidad,
                fila.probabilidad,
                fila.controlIngenieria,
                fila.controlAdministrativo,
              ),
              accionesMejora: fila.accionesMejora,
              responsables: fila.responsables,
              tareaCronogramaRefId: fila.tareaId,
              actividadCronogramaRefId: fila.actividadId ?? null,
            },
          })
        )
      )
      filasGuardadas += insertadas.length
      return insertadas
    } finally {
      release()
    }
  }

  const sem = new Semaphore(PARALELISMO)

  const promises = lotes.map(async (lote) => {
    await sem.acquire()
    try {
      if (signal?.aborted) return

      // Stagger concurrent calls: 500ms × index to avoid simultaneous API bursts
      if (lote.idx > 0) await new Promise(r => setTimeout(r, lote.idx * 500))
      if (signal?.aborted) return

      const progreso = Math.round(15 + (lote.idx / totalLotes) * 75)
      send('lote_iniciado', { lote: lote.idx + 1, totalLotes, tareas: lote.tareas.length, progreso, modelo: lote.modelo })

      const filasLote = await generarLote(
        resumenProyecto, lote.tareas, lote.modelo, lote.maxTokens, userId, proyectoId, lote.idx + 1, signal,
      )

      if (lote.modelo === modeloSonnet) lotesConSonnet++
      else lotesConHaiku++

      if (filasLote.length === 0) {
        lotesFallidos++
        send('lote_fallido', { lote: lote.idx + 1, mensaje: 'El lote no generó filas válidas' })
        return
      }

      const insertadas = await saveFilas(filasLote)

      lotesTerminados++
      const progresoFinal = Math.round(15 + (lotesTerminados / totalLotes) * 75)
      send('lote_completado', {
        lote: lote.idx + 1,
        filasGeneradas: insertadas.length,
        tareasEnLote: lote.tareas.length,
        filasPorTareaPromedio: lote.tareas.length > 0 ? (insertadas.length / lote.tareas.length).toFixed(1) : '0',
        totalFilas: filasGuardadas,
        progreso: progresoFinal,
      })
      send('filas_parciales', { filas: insertadas })
    } catch (err) {
      if (signal?.aborted) return
      lotesFallidos++
      let mensaje = err instanceof Error ? err.message : String(err)
      if (mensaje.includes('overloaded_error') || mensaje.includes('529') || mensaje.toLowerCase().includes('overloaded')) {
        mensaje = 'Servidor Anthropic saturado — se reintentó 4 veces sin éxito. Intentá de nuevo en unos minutos.'
      }
      console.error(`[iperc.generar] Lote ${lote.idx + 1} falló:`, mensaje)
      send('lote_fallido', { lote: lote.idx + 1, mensaje })
    } finally {
      sem.release()
    }
  })

  await Promise.allSettled(promises)

  return { filasGuardadas, lotesFallidos, lotesConSonnet, lotesConHaiku }
}

// ─── Función principal ──────────────────────────────────────────────────────

/**
 * @param soloTareaIds Genera solo esas tareas (un bloque) y borra solo sus
 * filas. Sin esto, se genera todo y se borra todo — que es como estaba y por
 * lo que no se podia generar por partes.
 */
export async function generarConIa(
  proyectoId: string,
  userId: string,
  edtIds: string[],
  send: SendFn,
  signal?: AbortSignal,
  soloTareaIds?: string[],
): Promise<void> {
  const startMs = Date.now()

  send('status', { mensaje: 'Cargando contexto del proyecto...', progreso: 5 })
  const ctx = await cargarContexto(proyectoId, edtIds, soloTareaIds)
  if (!ctx) {
    send('error', { mensaje: 'No se pudo cargar el contexto (IPERC, cronograma o proyecto no encontrado)' })
    return
  }

  const { iperc, tareasParaIperc, contextoTexto, edtsNombres } = ctx
  if (tareasParaIperc.length === 0) {
    send('error', { mensaje: 'Los EDTs seleccionados no tienen tareas' })
    return
  }

  const lock = await adquirirLock(iperc.id)
  if (!lock.ok) {
    const segs = Math.round((Date.now() - lock.conflicto!.iniciadaEn.getTime()) / 1000)
    send('error', { mensaje: `Ya hay una generación en curso, iniciada hace ${segs}s. Espera a que termine, o 10 minutos si quedó colgada.` })
    return
  }

  const generacionId = lock.generacionId!
  const modeloSonnet = getModelForTask('ssoma-iperc')
  const modeloHaiku = getModelForTask('ssoma-epp')

  const tareasAltoRiesgo = tareasParaIperc.filter(t => t.esAltoRiesgo)
  const tareasNormales = tareasParaIperc.filter(t => !t.esAltoRiesgo)

  // Partir tareas en lotes
  function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
  }

  let loteIdx = 0
  const lotes: LoteParalelo[] = [
    ...chunk(tareasAltoRiesgo, CFG_ALTO_RIESGO.tamLote).map(tareas => ({
      idx: loteIdx++, tareas, modelo: modeloSonnet, maxTokens: CFG_ALTO_RIESGO.maxTokens,
    })),
    ...chunk(tareasNormales, CFG_NORMAL.tamLote).map(tareas => ({
      idx: loteIdx++, tareas, modelo: modeloHaiku, maxTokens: CFG_NORMAL.maxTokens,
    })),
  ]

  send('inicio', {
    edtsSeleccionados: edtsNombres,
    totalTareas: tareasParaIperc.length,
    totalLotes: lotes.length,
    paralelismo: PARALELISMO,
    models: { sonnet: modeloSonnet, haiku: modeloHaiku },
  })

  try {
    // Al regenerar un bloque se borran solo SUS filas; las de los demas
    // bloques quedan intactas. Las filas agregadas a mano (sin tarea del
    // cronograma) nunca se tocan.
    send('status', { mensaje: 'Eliminando filas anteriores...', progreso: 8 })
    await prisma.ipercFila.deleteMany(
      soloTareaIds?.length
        ? { where: { ipercId: iperc.id, tareaCronogramaRefId: { in: soloTareaIds } } }
        : { where: { ipercId: iperc.id } },
    )

    send('status', { mensaje: 'Analizando contexto con IA...', progreso: 12 })
    const resumenProyecto = await resumir(contextoTexto, userId, proyectoId, signal)
    if (signal?.aborted) throw new Error('Cancelado por el usuario')

    const lotesAltoRiesgo = lotes.filter(l => l.modelo === modeloSonnet).length
    const lotesNormales = lotes.filter(l => l.modelo === modeloHaiku).length
    send('status', {
      mensaje: `Generando ${tareasParaIperc.length} tareas en ${lotes.length} lotes paralelos (máx ${PARALELISMO} simultáneos)…`,
      progreso: 14,
      totalLotes: lotes.length,
      totalTareas: tareasParaIperc.length,
      lotesAltoRiesgo,
      lotesNormales,
    })

    const { filasGuardadas, lotesFallidos, lotesConSonnet, lotesConHaiku } =
      await procesarEnParalelo(
        lotes, resumenProyecto, iperc.id, userId, proyectoId, send, signal,
        await maxNumeroActual(iperc.id),
      )

    if (signal?.aborted) throw new Error('Cancelado por el usuario')

    // Renumerar siguiendo el cronograma. Los lotes corren en paralelo y se
    // guardan conforme responden, así que el número que recibe cada fila al
    // insertarse depende de qué lote terminó primero, no del orden de obra.
    await renumerarSegunCronograma(iperc.id, proyectoId)

    const duracionMs = Date.now() - startMs
    const costoUsd =
      calculateCost(getModelForTask('chat-simple'), 3000, 1500) +
      calculateCost(modeloSonnet, 8000 * lotesConSonnet, 4000 * lotesConSonnet) +
      calculateCost(modeloHaiku, 5000 * lotesConHaiku, 3000 * lotesConHaiku)

    await completarLock(generacionId, {
      snapshotFilas: [],
      tokens: 0,
      costoUsd,
      duracionMs,
    })

    send('completado', {
      totalFilas: filasGuardadas,
      totalTareas: tareasParaIperc.length,
      edtsSeleccionados: edtsNombres,
      edtsEvaluados: edtIds.length,
      modelosUsados: { sonnet: lotesConSonnet, haiku: lotesConHaiku },
      lotesFallidos,
      duracionMs,
      costoUsd: Math.round(costoUsd * 10000) / 10000,
    })
  } catch (err) {
    if (signal?.aborted) {
      await fallarLock(generacionId, 'Cancelado por el usuario')
      send('cancelado', { totalFilas: 0 })
    } else {
      const mensaje = err instanceof Error ? err.message : String(err)
      await fallarLock(generacionId, mensaje)
      send('error', { mensaje })
    }
  }
}

/**
 * Reasigna `numero` a las filas siguiendo el orden del cronograma
 * (fase → EDT → actividad → tarea), conservando el orden relativo de las
 * filas que comparten tarea: una tarea genera varias filas de peligro y esas
 * deben quedar juntas y en la secuencia en que la IA las devolvió.
 *
 * Las posiciones se calculan sobre el cronograma COMPLETO, no sobre los EDTs
 * del bloque que se acaba de generar. Si se limitaran al bloque, las filas de
 * los demás bloques quedarían sin posición y se amontonarían al final: al
 * generar Comisionamiento de último, toda la Construcción ya generada se iba
 * detrás suyo.
 */
async function renumerarSegunCronograma(ipercId: string, proyectoId: string): Promise<void> {
  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
    select: { id: true },
  })
  if (!cronograma) return

  const [fases, edts, actividades, tareas] = await Promise.all([
    prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true },
    }),
    prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true, proyectoFaseId: true },
    }),
    prisma.proyectoActividad.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true },
    }),
    prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true, proyectoEdtId: true, proyectoActividadId: true },
    }),
  ])

  const faseOrden = new Map(fases.map(f => [f.id, f.orden]))
  const edtMap = new Map(edts.map(e => [e.id, e]))
  const actOrden = new Map(actividades.map(a => [a.id, a.orden]))

  const clave = (t: (typeof tareas)[number]) => {
    const edt = edtMap.get(t.proyectoEdtId)
    const fo = edt?.proyectoFaseId ? faseOrden.get(edt.proyectoFaseId) ?? 9999 : 9999
    const eo = edt?.orden ?? 9999
    const ao = t.proyectoActividadId ? actOrden.get(t.proyectoActividadId) ?? 9999 : 9999
    return [fo, eo, ao, t.orden ?? 9999]
  }
  const ordenadas = [...tareas].sort((a, b) => {
    const ka = clave(a)
    const kb = clave(b)
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
    return 0
  })
  const posicionTarea = new Map(ordenadas.map((t, i) => [t.id, i]))

  const filas = await prisma.ipercFila.findMany({
    where: { ipercId },
    select: { id: true, numero: true, tareaCronogramaRefId: true },
  })
  if (filas.length === 0) return

  const filasOrdenadas = [...filas].sort((a, b) => {
    // Una fila sin tarea del cronograma (agregada a mano) va al final.
    const pa = a.tareaCronogramaRefId ? posicionTarea.get(a.tareaCronogramaRefId) ?? 1e9 : 1e9
    const pb = b.tareaCronogramaRefId ? posicionTarea.get(b.tareaCronogramaRefId) ?? 1e9 : 1e9
    return pa !== pb ? pa - pb : a.numero - b.numero
  })

  const cambios = filasOrdenadas
    .map((f, i) => ({ id: f.id, numero: i + 1, antes: f.numero }))
    .filter(c => c.numero !== c.antes)
  if (cambios.length === 0) return

  // Dos pasadas: `numero` no es único en BD, pero dejar duplicados a medio
  // camino confunde a cualquiera que mire la tabla mientras corre.
  await prisma.$transaction([
    ...cambios.map(c =>
      prisma.ipercFila.update({ where: { id: c.id }, data: { numero: -c.numero } }),
    ),
    ...cambios.map(c =>
      prisma.ipercFila.update({ where: { id: c.id }, data: { numero: c.numero } }),
    ),
  ])
}

/** Numero mas alto ya usado en el IPERC, para no pisar filas de otros bloques. */
async function maxNumeroActual(ipercId: string): Promise<number> {
  const r = await prisma.ipercFila.aggregate({
    where: { ipercId },
    _max: { numero: true },
  })
  return r._max.numero ?? 0
}
