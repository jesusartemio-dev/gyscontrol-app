import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { MODELS } from '@/lib/agente/models'
import { trackUsage, calculateCost } from '@/lib/agente/usageTracker'
import { adquirirLock, completarLock, fallarLock } from '@/lib/iperc/mutex'
import { RESUMIR_PLAN_TRABAJO_IPERC_PROMPT } from '@/lib/iperc/prompts/resumirPlanTrabajo'
import {
  GENERAR_LOTE_IPERC_SYSTEM,
  buildPromptLote,
  type TareaParaIperc,
} from '@/lib/iperc/prompts/generarLoteIperc'
import { validarYParsearLote, type FilaIpercIa } from '@/lib/iperc/validarFilas'

const MAX_FILAS = 150
const TAREAS_POR_LOTE = 15
const MAX_TAREAS_MUESTREADAS = 120

function muestrearTareasRepresentativas(
  todasLasTareas: TareaParaIperc[]
): TareaParaIperc[] {
  if (todasLasTareas.length <= MAX_TAREAS_MUESTREADAS) return todasLasTareas

  const porEdt = new Map<string, TareaParaIperc[]>()
  for (const t of todasLasTareas) {
    const key = t.edt ?? 'sin_edt'
    if (!porEdt.has(key)) porEdt.set(key, [])
    porEdt.get(key)!.push(t)
  }

  const total = todasLasTareas.length
  const muestra: TareaParaIperc[] = []
  for (const tareasEdt of porEdt.values()) {
    const cuota = Math.max(1, Math.floor(MAX_TAREAS_MUESTREADAS * tareasEdt.length / total))
    muestra.push(...tareasEdt.slice(0, cuota))
  }

  if (muestra.length < MAX_TAREAS_MUESTREADAS) {
    const yaMuestreadas = new Set(muestra.map(t => t.tareaId))
    for (const t of todasLasTareas) {
      if (muestra.length >= MAX_TAREAS_MUESTREADAS) break
      if (!yaMuestreadas.has(t.tareaId)) muestra.push(t)
    }
  }

  return muestra.slice(0, MAX_TAREAS_MUESTREADAS)
}

type SendFn = (event: string, data: unknown) => void

// ─── Carga de contexto ──────────────────────────────────────────────────────

async function cargarContexto(proyectoId: string) {
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
    where: { proyectoCronogramaId: cronograma.id },
    select: { id: true, nombre: true, orden: true, proyectoFaseId: true },
    orderBy: { orden: 'asc' },
  })

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: { id: true, nombre: true, orden: true, proyectoEdtId: true },
    orderBy: { orden: 'asc' },
  })

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id },
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

  // Mapas para lookup rápido
  const faseMap = new Map(fases.map(f => [f.id, f.nombre]))
  const edtMap = new Map(edts.map(e => [e.id, { nombre: e.nombre, faseId: e.proyectoFaseId }]))
  const actMap = new Map(actividades.map(a => [a.id, a.nombre]))

  const tareasParaIperc: TareaParaIperc[] = tareas.map(t => {
    const edt = edtMap.get(t.proyectoEdtId)
    const faseName = edt?.faseId ? (faseMap.get(edt.faseId) ?? 'EJECUCIÓN') : 'EJECUCIÓN'
    const edtName = edt?.nombre ?? 'General'
    const actName = t.proyectoActividadId ? (actMap.get(t.proyectoActividadId) ?? t.nombre) : t.nombre
    return {
      tareaId: t.id,
      actividadId: t.proyectoActividadId ?? null,
      proceso: faseName,
      edt: edtName,
      actividad: actName,
      tarea: t.nombre,
      horasEstimadas: t.horasEstimadas ? Number(t.horasEstimadas) : null,
      personasEstimadas: t.personasEstimadas,
    }
  })

  const contextoTexto = `
PROYECTO: ${proyecto.nombre} (${proyecto.codigo ?? 'sin código'})
CRONOGRAMA DE PLANIFICACIÓN — ${tareas.length} tareas en ${fases.length} fases

${fases.map(fase => {
  const edtsDeFase = edts.filter(e => e.proyectoFaseId === fase.id)
  return `## FASE: ${fase.nombre}\n${edtsDeFase.map(edt => {
    const actsDEdt = actividades.filter(a => a.proyectoEdtId === edt.id)
    return `  EDT: ${edt.nombre}\n${actsDEdt.map(act => {
      const tareasDEAct = tareas.filter(t => t.proyectoActividadId === act.id)
      return `    Actividad: ${act.nombre}\n${tareasDEAct.map(t =>
        `      - Tarea: ${t.nombre} | ${t.horasEstimadas ?? '?'}h | ${t.personasEstimadas} pers | id=${t.id}`
      ).join('\n')}`
    }).join('\n')}`
  }).join('\n')}`
}).join('\n\n')}
  `.trim()

  return { iperc, tareasParaIperc, contextoTexto }
}

// ─── Resumen con Haiku ──────────────────────────────────────────────────────

async function resumirConHaiku(
  contextoTexto: string,
  userId: string,
  proyectoId: string,
  signal?: AbortSignal,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  const resp = await anthropic.messages.create({
    model: MODELS.haiku,
    max_tokens: 4000,
    temperature: 0.3,
    system: RESUMIR_PLAN_TRABAJO_IPERC_PROMPT,
    messages: [{ role: 'user', content: `CONTEXTO DEL PROYECTO:\n\n${contextoTexto}\n\nGenera el resumen SSOMA para IPERC.` }],
  }, { signal })

  trackUsage({
    userId,
    tipo: 'iperc.resumen',
    modelo: MODELS.haiku,
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

// ─── Lote con Sonnet ────────────────────────────────────────────────────────

async function generarLoteConSonnet(
  resumenProyecto: string,
  tareas: TareaParaIperc[],
  resumenPrevias: string,
  userId: string,
  proyectoId: string,
  loteIndex: number,
  signal?: AbortSignal,
): Promise<FilaIpercIa[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  const userMessage = buildPromptLote(resumenProyecto, tareas, resumenPrevias)

  const resp = await (anthropic.messages.create as any)({
    model: MODELS.sonnet,
    max_tokens: 20000,
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
    modelo: MODELS.sonnet,
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
  send: SendFn,
  signal?: AbortSignal,
): Promise<void> {
  const startMs = Date.now()

  // 1. Cargar contexto
  send('status', { mensaje: 'Cargando contexto del proyecto...', progreso: 5 })
  const ctx = await cargarContexto(proyectoId)
  if (!ctx) {
    send('error', { mensaje: 'No se pudo cargar el contexto (IPERC, cronograma o proyecto no encontrado)' })
    return
  }

  const { iperc, tareasParaIperc, contextoTexto } = ctx
  if (tareasParaIperc.length === 0) {
    send('error', { mensaje: 'El cronograma de planificación no tiene tareas' })
    return
  }

  // 2. Adquirir mutex
  const lock = await adquirirLock(iperc.id)
  if (!lock.ok) {
    const segs = Math.round((Date.now() - lock.conflicto!.iniciadaEn.getTime()) / 1000)
    send('error', { mensaje: `Ya hay una generación en curso, iniciada hace ${segs}s. Esperá a que termine o aguardá 10 min.` })
    return
  }

  const generacionId = lock.generacionId!
  let totalTokens = 0
  let totalCostoUsd = 0

  try {
    // 3. Eliminar filas existentes
    send('status', { mensaje: 'Eliminando filas anteriores...', progreso: 8 })
    await prisma.ipercFila.deleteMany({ where: { ipercId: iperc.id } })

    // 4. Resumen con Haiku
    send('status', { mensaje: 'Analizando contexto con IA (Haiku)...', progreso: 12 })
    const resumenProyecto = await resumirConHaiku(contextoTexto, userId, proyectoId, signal)
    if (signal?.aborted) throw new Error('Cancelado por el usuario')

    // 5. Partir en lotes y procesar con Sonnet
    const totalTareasProyecto = tareasParaIperc.length
    const tareasLimitadas = muestrearTareasRepresentativas(tareasParaIperc)
    const tareasMuestreadas = tareasLimitadas.length
    const coberturaPct = Math.round((tareasMuestreadas / totalTareasProyecto) * 100)
    const coberturaStr = tareasMuestreadas < totalTareasProyecto
      ? ` (muestra representativa: ${tareasMuestreadas}/${totalTareasProyecto} tareas, ${coberturaPct}%)`
      : ''

    send('status', {
      mensaje: `Generando ${tareasMuestreadas} tareas en lotes de ${TAREAS_POR_LOTE}${coberturaStr}...`,
      progreso: 14,
      totalTareasProyecto,
      tareasMuestreadas,
    })

    const totalLotes = Math.ceil(tareasLimitadas.length / TAREAS_POR_LOTE)
    const todasLasFilas: FilaIpercIa[] = []
    let filasGuardadas = 0

    for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
      if (signal?.aborted) throw new Error('Cancelado por el usuario')
      if (filasGuardadas >= MAX_FILAS) break

      const inicio = loteIdx * TAREAS_POR_LOTE
      const fin = Math.min(inicio + TAREAS_POR_LOTE, tareasLimitadas.length)
      const lote = tareasLimitadas.slice(inicio, fin)

      const progreso = Math.round(15 + ((loteIdx / totalLotes) * 75))
      send('lote_iniciado', { lote: loteIdx + 1, totalLotes, tareas: lote.length, progreso })

      // Resumen breve de filas ya generadas (para que Sonnet tenga contexto)
      const resumenPrevias = todasLasFilas.length > 0
        ? todasLasFilas.slice(-5).map(f => `- ${f.proceso}/${f.actividad}/${f.tarea}: ${f.peligro}`).join('\n')
        : ''

      const filasLote = await generarLoteConSonnet(
        resumenProyecto,
        lote,
        resumenPrevias,
        userId,
        proyectoId,
        loteIdx + 1,
        signal,
      )

      if (filasLote.length === 0) {
        send('lote_error', { lote: loteIdx + 1, mensaje: 'El lote no generó filas válidas' })
        continue
      }

      // 6. Guardar filas en DB con auto-numeración
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
        lote: loteIdx + 1,
        filasGeneradas: insertadas.length,
        totalFilas: filasGuardadas,
      })

      send('filas_parciales', {
        filas: insertadas,
      })
    }

    // 7. Calcular totales de uso
    // Estimación conservadora basada en tokens típicos por lote
    const duracionMs = Date.now() - startMs
    totalCostoUsd = calculateCost(MODELS.haiku, 3000, 1500) +
      calculateCost(MODELS.sonnet, 8000 * totalLotes, 4000 * totalLotes)

    // 8. Completar generacion record
    await completarLock(generacionId, {
      snapshotFilas: todasLasFilas,
      tokens: totalTokens,
      costoUsd: totalCostoUsd,
      duracionMs,
    })

    send('completado', {
      totalFilas: filasGuardadas,
      duracionMs,
      costoUsd: Math.round(totalCostoUsd * 10000) / 10000,
      totalTareasProyecto,
      tareasMuestreadas,
      coberturaPct,
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
