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
import { serializarContextoParaIA } from '@/lib/planTrabajo/contextoIA'
import { validarSeccionesPlan } from '@/lib/planTrabajo/validarSecciones'
import { guardarSecciones } from '@/lib/planTrabajo/guardarSecciones'
import { RESUMEN_PROYECTO_PROMPT } from '@/lib/planTrabajo/prompts/resumirProyecto'
import {
  PLAN_TRABAJO_SYSTEM_INSTRUCCIONES,
  SECCIONES_CONFIG,
} from '@/lib/planTrabajo/prompts/generarPlan'
import type { PlanTrabajoContexto } from '@/types/planTrabajo'

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
  contexto: PlanTrabajoContexto,
  userId: string,
  prevResultados: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  // matrizRaci necesita las siglas del personal ya generado para ser coherente
  const contextoPrevio = seccionId === 'matrizRaci' && prevResultados.personalAsignado
    ? `\n\nPERSONAL YA GENERADO (usá las mismas siglas en la matriz):\n${JSON.stringify(prevResultados.personalAsignado, null, 2)}`
    : ''

  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
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
        content: `RESUMEN EJECUTIVO DEL PROYECTO:\n\n${resumenProyecto}${contextoPrevio}\n\nGenera SOLO la sección "${label}". Devolvé ÚNICAMENTE este JSON sin markdown:\n\n${schema}`,
      },
    ],
  }, { signal })

  const usageRaw = response.usage as unknown as Record<string, number>
  console.log(`[generar-ia] ${seccionId}: stop_reason=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens} cache_create=${usageRaw.cache_creation_input_tokens ?? 0} cache_read=${usageRaw.cache_read_input_tokens ?? 0} ms=${Date.now()-inicio}`)

  trackUsage({
    userId,
    tipo: `plan-trabajo.seccion.${seccionId}`,
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
    tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId: contexto.proyecto.id },
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Sección "${label}" excede el límite de tokens`)
  }

  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const jsonLimpio = texto
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  const parsed = JSON.parse(jsonLimpio)
  return (parsed as Record<string, unknown>)[seccionId]
}

// ─── Endpoint ───────────────────────────────────────────────────────────────

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
  const rolesConAccesoTotal = ['admin', 'gerente']
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

  const planId = contexto.planTrabajo.id
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

        // Fase B: Sonnet genera cada sección secuencialmente y la guarda al instante
        const total = SECCIONES_CONFIG.length
        const planParcial: Record<string, unknown> = {}
        const seccionesGuardadas: string[] = []
        const seccionesConError: string[] = []

        for (let i = 0; i < total; i++) {
          if (signal.aborted) {
            console.log(`[generar-ia] Cancelado por el cliente — deteniendo en sección ${i}`)
            break
          }

          const { id, label, schema } = SECCIONES_CONFIG[i]
          const progreso = 10 + Math.round((i / total) * 82)
          send('status', { fase: `seccion-${id}`, mensaje: `Generando ${label}...`, progreso })

          try {
            const valor = await generarSeccion(id, schema, label, resumenProyecto, contexto, userId, planParcial, signal)
            planParcial[id] = valor

            // Validar y guardar esta sección inmediatamente
            const { secciones: seccionValidada } = validarSeccionesPlan({ [id]: valor })
            if (Object.keys(seccionValidada).length > 0) {
              await guardarSecciones(proyectoId, seccionValidada)
              seccionesGuardadas.push(id)
              send('seccion', { id })
              console.log(`[generar-ia] ${id}: guardado OK`)
            } else {
              seccionesConError.push(id)
              console.warn(`[generar-ia] ${id}: validación falló`)
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[generar-ia] ${id}: FALLÓ — ${msg}`)
            seccionesConError.push(id)
          }
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
