import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
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

const MAX_FILAS = 200
const LOTE_ALTO_RIESGO = 10  // Sonnet para EJECUCIÓN y fases de campo
const LOTE_NORMAL = 15       // Haiku para otras fases

const REGEX_ALTO_RIESGO = /ejecuci|montaje|obra|instalaci|construcci|comisionamiento/i

function esFaseAltoRiesgo(nombre: string): boolean {
  const n = nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return REGEX_ALTO_RIESGO.test(n)
}

type SendFn = (event: string, data: unknown) => void

// ─── Carga de contexto ──────────────────────────────────────────────────────

async function cargarContexto(proyectoId: string, edtIds: string[]) {
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
    orderBy: [{ proyectoEdtId: 'asc' }, { orden: 'asc' }],
  })

  const faseMap = new Map(fases.map(f => [f.id, f]))
  const edtMap = new Map(edts.map(e => [e.id, e]))
  const actMap = new Map(actividades.map(a => [a.id, a.nombre]))

  const tareasParaIperc: TareaParaIperc[] = tareas.map(t => {
    const edt = edtMap.get(t.proyectoEdtId)
    const fase = edt?.proyectoFaseId ? faseMap.get(edt.proyectoFaseId) : null
    const edtNombre = edt?.nombre ?? 'General'
    const faseNombre = fase?.nombre ?? 'EJECUCIÓN'
    const esAltoRiesgo = esFaseAltoRiesgo(faseNombre)
    // actividad = actividad.nombre si existe, si no = edt.nombre (nunca tarea.nombre)
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
TOTAL TAREAS A EVALUAR: ${tareas.length}

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

  return { iperc, tareasParaIperc, contextoTexto, edtsNombres }
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

// ─── Lote ────────────────────────────────────────────────────────────────────

async function generarLote(
  resumenProyecto: string,
  tareas: TareaParaIperc[],
  resumenPrevias: string,
  modelo: string,
  maxTokens: number,
  userId: string,
  proyectoId: string,
  loteIndex: number,
  signal?: AbortSignal,
): Promise<FilaIpercIa[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  const userMessage = buildPromptLote(resumenProyecto, tareas, resumenPrevias)

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

// ─── Función principal ──────────────────────────────────────────────────────

export async function generarConIa(
  proyectoId: string,
  userId: string,
  edtIds: string[],
  send: SendFn,
  signal?: AbortSignal,
): Promise<void> {
  const startMs = Date.now()

  send('status', { mensaje: 'Cargando contexto del proyecto...', progreso: 5 })
  const ctx = await cargarContexto(proyectoId, edtIds)
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
    send('error', { mensaje: `Ya hay una generación en curso, iniciada hace ${segs}s. Esperá a que termine o aguardá 10 min.` })
    return
  }

  const generacionId = lock.generacionId!
  const modeloSonnet = getModelForTask('ssoma-iperc')
  const modeloHaiku = getModelForTask('ssoma-epp')

  send('inicio', {
    edtsSeleccionados: edtsNombres,
    totalTareas: tareasParaIperc.length,
    models: { sonnet: modeloSonnet, haiku: modeloHaiku },
  })

  try {
    send('status', { mensaje: 'Eliminando filas anteriores...', progreso: 8 })
    await prisma.ipercFila.deleteMany({ where: { ipercId: iperc.id } })

    send('status', { mensaje: 'Analizando contexto con IA...', progreso: 12 })
    const resumenProyecto = await resumir(contextoTexto, userId, proyectoId, signal)
    if (signal?.aborted) throw new Error('Cancelado por el usuario')

    // Separar tareas por tipo: alto riesgo (Sonnet) vs normal (Haiku)
    const tareasAltoRiesgo = tareasParaIperc.filter(t => t.esAltoRiesgo)
    const tareasNormales = tareasParaIperc.filter(t => !t.esAltoRiesgo)

    // Alto riesgo: Sonnet + max 16 000 tokens (10 tareas × 4 filas × ~350 tok = 14 000)
    // Normal: Haiku + max 8 192 tokens (15 tareas × 2 filas × ~250 tok = 7 500)
    const grupos: Array<{ tareas: TareaParaIperc[]; modelo: string; tamLote: number; maxTokens: number }> = []
    if (tareasAltoRiesgo.length > 0) grupos.push({ tareas: tareasAltoRiesgo, modelo: modeloSonnet, tamLote: LOTE_ALTO_RIESGO, maxTokens: 16000 })
    if (tareasNormales.length > 0) grupos.push({ tareas: tareasNormales, modelo: modeloHaiku, tamLote: LOTE_NORMAL, maxTokens: 8192 })

    const totalLotes = grupos.reduce((acc, g) => acc + Math.ceil(g.tareas.length / g.tamLote), 0)

    send('status', {
      mensaje: `Generando ${tareasParaIperc.length} tareas en ${totalLotes} lotes (${tareasAltoRiesgo.length} Sonnet, ${tareasNormales.length} Haiku)...`,
      progreso: 14,
      totalTareas: tareasParaIperc.length,
    })

    const todasLasFilas: FilaIpercIa[] = []
    let filasGuardadas = 0
    let loteGlobal = 0
    let lotesConSonnet = 0
    let lotesConHaiku = 0

    for (const { tareas, modelo, tamLote, maxTokens } of grupos) {
      const totalLotesGrupo = Math.ceil(tareas.length / tamLote)

      for (let loteIdx = 0; loteIdx < totalLotesGrupo; loteIdx++) {
        if (signal?.aborted) throw new Error('Cancelado por el usuario')
        if (filasGuardadas >= MAX_FILAS) break

        loteGlobal++
        const inicio = loteIdx * tamLote
        const fin = Math.min(inicio + tamLote, tareas.length)
        const lote = tareas.slice(inicio, fin)

        const progreso = Math.round(15 + (loteGlobal / totalLotes) * 75)
        send('lote_iniciado', { lote: loteGlobal, totalLotes, tareas: lote.length, progreso, modelo })

        const resumenPrevias = todasLasFilas.length > 0
          ? todasLasFilas.slice(-5).map(f => `- ${f.proceso}/${f.actividad}/${f.tarea}: ${f.peligro}`).join('\n')
          : ''

        const filasLote = await generarLote(
          resumenProyecto, lote, resumenPrevias, modelo, maxTokens, userId, proyectoId, loteGlobal, signal,
        )

        if (modelo === modeloSonnet) lotesConSonnet++
        else lotesConHaiku++

        if (filasLote.length === 0) {
          send('lote_error', { lote: loteGlobal, mensaje: 'El lote no generó filas válidas' })
          continue
        }

        const insertadas = await prisma.$transaction(async (tx) => {
          const existentes = await tx.ipercFila.count({ where: { ipercId: iperc.id } })
          const rows = filasLote.slice(0, MAX_FILAS - filasGuardadas)
          return await Promise.all(
            rows.map((fila, i) =>
              tx.ipercFila.create({
                data: {
                  ipercId: iperc.id,
                  numero: existentes + i + 1,
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
                  controlIngenieria: fila.controlIngenieria,
                  controlAdministrativo: fila.controlAdministrativo,
                  controlReceptor: fila.controlReceptor,
                  severidadResidual: fila.severidadResidual,
                  probabilidadResidual: fila.probabilidadResidual,
                  accionesMejora: fila.accionesMejora,
                  responsables: fila.responsables,
                  tareaCronogramaRefId: fila.tareaId,
                  actividadCronogramaRefId: fila.actividadId ?? null,
                },
              })
            )
          )
        })

        todasLasFilas.push(...filasLote.slice(0, insertadas.length))
        filasGuardadas += insertadas.length

        send('lote_completado', {
          lote: loteGlobal,
          filasGeneradas: insertadas.length,
          tareasEnLote: lote.length,
          filasPorTareaPromedio: (insertadas.length / lote.length).toFixed(1),
          totalFilas: filasGuardadas,
        })
        send('filas_parciales', { filas: insertadas })
      }
    }

    const duracionMs = Date.now() - startMs
    const costoUsd =
      calculateCost(getModelForTask('chat-simple'), 3000, 1500) +
      calculateCost(modeloSonnet, 8000 * lotesConSonnet, 4000 * lotesConSonnet) +
      calculateCost(modeloHaiku, 5000 * lotesConHaiku, 3000 * lotesConHaiku)

    await completarLock(generacionId, {
      snapshotFilas: todasLasFilas,
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
