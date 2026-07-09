import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { cargarContextoPlanTrabajo } from '@/lib/planTrabajo/cargarContexto'
import { adquirirLockIA, liberarLockIA } from '@/lib/planTrabajo/mutex'
import { serializarContextoParaIA, construirBloqueHechosEtapa1 } from '@/lib/planTrabajo/contextoIA'
import { validarSeccionesPlan } from '@/lib/planTrabajo/validarSecciones'
import { guardarSeccionParalela, recalcularCompletitud } from '@/lib/planTrabajo/guardarSecciones'
import { RESUMEN_PROYECTO_PROMPT } from '@/lib/planTrabajo/prompts/resumirProyecto'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import { etapa1Completa } from '@/lib/planTrabajo/etapas'
import { generarAlcanceDetallado } from '@/lib/planTrabajo/generarAlcanceDetallado'
import {
  PLAN_TRABAJO_SYSTEM_INSTRUCCIONES,
  SECCIONES_CONFIG,
} from '@/lib/planTrabajo/prompts/generarPlan'
import type { PlanTrabajoContexto, PlanPersonal } from '@/types/planTrabajo'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// ─── Helpers internos ───────────────────────────────────────────────────────

async function ejecutarFaseA(
  contexto: PlanTrabajoContexto,
  userId: string,
  signal?: AbortSignal
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const contextoSerializado = serializarContextoParaIA(contexto)
  const inicio = Date.now()

  console.log(`[generar-ia] FaseA: llamando Haiku (modelo=${MODELS.haiku})`)
  const response = await anthropic.messages.create({
    model: MODELS.haiku,
    max_tokens: 4096,
    system: RESUMEN_PROYECTO_PROMPT,
    messages: [
      {
        role: 'user',
        content: `CONTEXTO DEL PROYECTO:\n\n${contextoSerializado}\n\nGenera el resumen ejecutivo técnico.`,
      },
    ],
  }, { signal })
  console.log(`[generar-ia] FaseA: Haiku OK — stop_reason=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens} ms=${Date.now()-inicio}`)

  trackUsage({
    userId,
    tipo: 'plan-trabajo.resumen',
    modelo: MODELS.haiku,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId: contexto.proyecto.id },
  })

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

async function generarSeccion(
  seccionId: string,
  schema: string,
  label: string,
  resumenProyecto: string,
  hechosEtapa1: string,
  contexto: PlanTrabajoContexto,
  userId: string,
  signal?: AbortSignal,
  maxTokens = 8192,
  modeloConfig: 'haiku' | 'sonnet' = 'sonnet'
): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()
  const modelo = modeloConfig === 'haiku' ? MODELS.haiku : MODELS.sonnet

  // Reintenta 1 vez con un presupuesto de tokens mayor si la salida se trunca —
  // nunca se persiste el JSON reparado de una respuesta truncada (informe §4.4).
  const MAX_REINTENTOS_TRUNCADO = 1
  let tokensParaIntento = maxTokens
  let ultimoStopReason: string | null | undefined = null

  for (let intento = 0; intento <= MAX_REINTENTOS_TRUNCADO; intento++) {
    const response = await anthropic.messages.create({
      model: modelo,
      max_tokens: tokensParaIntento,
      system: [
        {
          type: 'text',
          text: PLAN_TRABAJO_SYSTEM_INSTRUCCIONES,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `RESUMEN EJECUTIVO DEL PROYECTO:\n\n${resumenProyecto}${hechosEtapa1}\n\nGenera SOLO la sección "${label}". Devolvé ÚNICAMENTE este JSON sin markdown:\n\n${schema}`,
        },
      ],
    }, { signal })

    const usageRaw = response.usage as unknown as Record<string, number>
    console.log(`[generar-ia] ${seccionId}: intento=${intento} max_tokens=${tokensParaIntento} stop_reason=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens} cache_create=${usageRaw.cache_creation_input_tokens ?? 0} cache_read=${usageRaw.cache_read_input_tokens ?? 0} ms=${Date.now()-inicio}`)

    trackUsage({
      userId,
      tipo: `plan-trabajo.seccion.${seccionId}`,
      modelo,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
      tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId: contexto.proyecto.id, intento },
    })

    ultimoStopReason = response.stop_reason

    if (response.stop_reason === 'max_tokens') {
      if (intento < MAX_REINTENTOS_TRUNCADO) {
        tokensParaIntento = Math.min(tokensParaIntento * 2, 16000)
        console.warn(`[generar-ia] ${seccionId}: truncada por max_tokens, reintentando con max_tokens=${tokensParaIntento}`)
        continue
      }
      break
    }

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const parsed = parseJsonIA(texto) as Record<string, unknown>
    return parsed[seccionId]
  }

  throw new Error(
    `Sección "${label}" excede el límite de tokens incluso tras reintentar (stop_reason=${ultimoStopReason}, max_tokens=${tokensParaIntento})`
  )
}

// ─── Endpoint ───────────────────────────────────────────────────────────────

// POST /api/proyectos/[id]/plan-trabajo/generar-ia
// Etapa 2 ("Redactar con IA"): genera SOLO las secciones narrativas —
// objetivo, alcanceGeneral, alcanceDetallado, eppRequeridos, herramientasYEquipos,
// restricciones. Requiere que la Etapa 1 (calcular-datos) ya esté completa,
// porque el prompt recibe sus resultados como hechos inmutables.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id
  const signal = req.signal

  const proyectoBase = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      id: true,
      gestorId: true,
      supervisorId: true,
      liderId: true,
      comercialId: true,
    },
  })

  if (!proyectoBase) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role } = session.user
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']
  const esGestorODirectivo =
    proyectoBase.gestorId === userId ||
    proyectoBase.supervisorId === userId ||
    proyectoBase.liderId === userId ||
    proyectoBase.comercialId === userId

  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const enabled = await isIAFeatureEnabled('planTrabajo')
  if (!enabled) {
    return Response.json({ error: 'La funcionalidad de IA para Plan de Trabajo está deshabilitada' }, { status: 403 })
  }

  const contexto = await cargarContextoPlanTrabajo(proyectoId)
  if (!contexto) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  if (!contexto.prerrequisitos.puedeGenerar) {
    return Response.json(
      {
        error: 'No se puede generar el Plan de Trabajo',
        bloqueantesFaltantes: contexto.prerrequisitos.bloqueantesFaltantes,
      },
      { status: 409 }
    )
  }

  if (!contexto.planTrabajo) {
    return Response.json(
      { error: 'El Plan de Trabajo no existe — crearlo primero con POST /plan-trabajo' },
      { status: 409 }
    )
  }

  if (!etapa1Completa(contexto.planTrabajo.bloquesCompletitud as Record<string, boolean> | null)) {
    return Response.json(
      {
        error: 'Falta calcular la Etapa 1 (Generar datos) antes de redactar con IA — el prompt necesita el personal real, las horas totales y el cronograma resumen ya calculados.',
      },
      { status: 409 }
    )
  }

  const planTrabajo = contexto.planTrabajo
  const planId = planTrabajo.id
  const lock = await adquirirLockIA(planId, 'generar')
  if (!lock.ok) {
    const segs = Math.round((Date.now() - lock.conflicto!.iniciadaEn.getTime()) / 1000)
    return Response.json(
      { error: `Ya hay una operación IA en curso (${lock.conflicto?.operacion}), iniciada hace ${segs}s. Esperá a que termine o aguardá 10 min para que expire.` },
      { status: 409 }
    )
  }

  const encoder = new TextEncoder()
  console.log(`[generar-ia] Stream creado — planId=${planId} proyectoId=${proyectoId}`)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Fase A: Haiku resume el contexto
        send('status', { fase: 'A', mensaje: 'Analizando contexto del proyecto...', progreso: 5 })
        const resumenProyecto = await ejecutarFaseA(contexto, userId, signal)
        console.log(`[generar-ia] FaseA: resumen generado — ${resumenProyecto.length} chars`)

        // Hechos de Etapa 1 (personal real, totalHH real) — se le inyectan a
        // cada sección como datos inmutables (informe §6).
        const hechosEtapa1 = construirBloqueHechosEtapa1(planTrabajo)

        // Fase B: Sonnet/Haiku genera las secciones narrativas EN PARALELO
        const seccionesGuardadas: string[] = []
        const seccionesConError: string[] = []

        const generarYGuardar = async (config: (typeof SECCIONES_CONFIG)[number]) => {
          const { id, label, schema, maxTokens, modelo } = config
          if (signal.aborted) return
          send('status', { fase: `seccion-${id}`, mensaje: `Generando ${label}...` })
          try {
            const valor = await generarSeccion(id, schema, label, resumenProyecto, hechosEtapa1, contexto, userId, signal, maxTokens, modelo)

            const { secciones: seccionValidada, errores: erroresValidacion } = validarSeccionesPlan({ [id]: valor })
            if (Object.keys(seccionValidada).length > 0) {
              await guardarSeccionParalela(proyectoId, seccionValidada)
              seccionesGuardadas.push(id)
              send('seccion', { id })
              console.log(`[generar-ia] ${id}: guardado OK`)
            } else {
              const motivo = erroresValidacion[id] ?? 'validación falló'
              seccionesConError.push(id)
              send('seccion-error', { id, motivo })
              console.warn(`[generar-ia] ${id}: ${motivo}`)
            }
          } catch (err) {
            if (signal.aborted) return
            const motivo = err instanceof Error ? err.message : String(err)
            console.error(`[generar-ia] ${id}: FALLÓ — ${motivo}`)
            seccionesConError.push(id)
            send('seccion-error', { id, motivo })
          }
        }

        // alcanceDetallado: estructura del servidor + IA solo redacta descripcion
        // (Bloque 4 — ver generarAlcanceDetallado.ts). No usa SECCIONES_CONFIG
        // porque su prompt y su forma de llamar a la IA son distintos (batch +
        // individual por EDT, no un único JSON monolítico).
        const generarYGuardarAlcanceDetallado = async () => {
          const id = 'alcanceDetallado'
          if (signal.aborted) return
          send('status', { fase: `seccion-${id}`, mensaje: 'Generando Alcance Detallado...' })
          try {
            const personalCalculado = (planTrabajo.personalAsignado as PlanPersonal[] | null) ?? []
            const { data: valor, advertencias: advAlcance } = await generarAlcanceDetallado(
              contexto.cronograma.cronogramaSeleccionado,
              personalCalculado,
              hechosEtapa1,
              userId,
              proyectoId,
              signal
            )
            for (const adv of advAlcance) console.warn(`[generar-ia] alcanceDetallado: ${adv}`)

            const { secciones: seccionValidada, errores: erroresValidacion } = validarSeccionesPlan({ [id]: valor })
            if (Object.keys(seccionValidada).length > 0) {
              await guardarSeccionParalela(proyectoId, seccionValidada)
              seccionesGuardadas.push(id)
              send('seccion', { id, advertencias: advAlcance })
              console.log(`[generar-ia] ${id}: guardado OK`)
            } else {
              const motivo = erroresValidacion[id] ?? 'validación falló'
              seccionesConError.push(id)
              send('seccion-error', { id, motivo })
              console.warn(`[generar-ia] ${id}: ${motivo}`)
            }
          } catch (err) {
            if (signal.aborted) return
            const motivo = err instanceof Error ? err.message : String(err)
            console.error(`[generar-ia] alcanceDetallado: FALLÓ — ${motivo}`)
            seccionesConError.push(id)
            send('seccion-error', { id, motivo })
          }
        }

        send('status', { fase: 'paralelo', mensaje: 'Redactando secciones del plan...', progreso: 10 })
        await Promise.allSettled([
          ...SECCIONES_CONFIG.map(config => generarYGuardar(config)),
          generarYGuardarAlcanceDetallado(),
        ])

        // Recalcular bloquesCompletitud una sola vez al final (evita race condition)
        if (seccionesGuardadas.length > 0) {
          await recalcularCompletitud(proyectoId)
        }

        if (seccionesGuardadas.length === 0 && !signal.aborted) {
          throw new Error('Ninguna sección pudo generarse correctamente')
        }

        send('done', {
          seccionesGuardadas,
          seccionesConError,
          cancelado: signal.aborted,
        })
        console.log(`[generar-ia] done — guardadas=${seccionesGuardadas.length} errores=${seccionesConError.length}`)
      } catch (error: unknown) {
        console.error('[generar-ia] ERROR en start():', error)
        const mensaje = error instanceof Error ? error.message : 'Error interno'
        send('error', { mensaje })
      } finally {
        await liberarLockIA(planId)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
