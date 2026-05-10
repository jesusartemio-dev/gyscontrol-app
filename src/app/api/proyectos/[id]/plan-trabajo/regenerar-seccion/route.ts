import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { cargarContextoPlanTrabajo } from '@/lib/planTrabajo/cargarContexto'
import { adquirirLockIA, liberarLockIA } from '@/lib/planTrabajo/mutex'
import { serializarContextoParaIA, serializarEstadoActualPlan } from '@/lib/planTrabajo/contextoIA'
import { validarSeccionIndividual } from '@/lib/planTrabajo/validarSecciones'
import { guardarSeccionIndividual } from '@/lib/planTrabajo/guardarSecciones'
import { PLAN_TRABAJO_SYSTEM_INSTRUCCIONES } from '@/lib/planTrabajo/prompts/generarPlan'
import { buildPromptRegeneracion } from '@/lib/planTrabajo/prompts/regenerarSeccion'
import type { SeccionRegenerable } from '@/types/planTrabajo'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const SECCIONES_REGENERABLES = [
  'objetivo',
  'alcanceGeneral',
  'alcanceDetallado',
  'eppRequeridos',
  'herramientasYEquipos',
  'restricciones',
  'personalAsignado',
  'matrizRaci',
  'histogramas',
  'cronogramaResumen',
  'responsabilidades',
  'referencias',
] as const

const bodySchema = z.object({
  seccion: z.enum(SECCIONES_REGENERABLES),
  instruccionesAdicionales: z.string().max(2000).optional(),
})

// ─── Helper ─────────────────────────────────────────────────────────────────

async function ejecutarSonnetRegeneracion(
  contextoSerializado: string,
  estadoRelevante: string,
  seccion: SeccionRegenerable,
  instruccionesAdicionales: string | undefined,
  proyectoId: string,
  userId: string
): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  // Contexto del proyecto + instrucciones de sección en el user message.
  // El system (PLAN_TRABAJO_SYSTEM_INSTRUCCIONES) es constante → cache hits entre llamadas.
  const promptUsuario = [
    buildPromptRegeneracion(seccion, instruccionesAdicionales),
    '',
    '=== CONTEXTO DEL PROYECTO ===',
    contextoSerializado,
    '',
    '=== SECCIONES RELEVANTES DEL PLAN ACTUAL ===',
    estadoRelevante,
  ].join('\n')

  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: PLAN_TRABAJO_SYSTEM_INSTRUCCIONES,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: promptUsuario }],
  })

  const usageRaw = response.usage as unknown as Record<string, number>
  trackUsage({
    userId,
    tipo: 'plan-trabajo.regenerar-seccion',
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
    tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId, seccion },
  })

  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const jsonLimpio = texto
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  return JSON.parse(jsonLimpio)
}

// ─── Endpoint ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return Response.json(
      { error: 'Body inválido — se requiere { seccion, instruccionesAdicionales? }' },
      { status: 400 }
    )
  }

  const { seccion, instruccionesAdicionales } = body
  const { id: proyectoId } = await params
  const userId = session.user.id

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
    return Response.json(
      { error: 'La funcionalidad de IA para Plan de Trabajo está deshabilitada' },
      { status: 403 }
    )
  }

  const contexto = await cargarContextoPlanTrabajo(proyectoId)
  if (!contexto) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  if (!contexto.prerrequisitos.puedeGenerar) {
    return Response.json(
      {
        error: 'No se puede regenerar secciones del Plan de Trabajo',
        bloqueantesFaltantes: contexto.prerrequisitos.bloqueantesFaltantes,
      },
      { status: 409 }
    )
  }

  if (!contexto.planTrabajo) {
    return Response.json(
      {
        error: 'El Plan de Trabajo no existe — generarlo primero con POST /plan-trabajo/generar-ia',
      },
      { status: 409 }
    )
  }

  // Mutex: prevenir operaciones IA paralelas en el mismo plan
  const planId = contexto.planTrabajo.id
  const lock = await adquirirLockIA(planId, `regenerar:${seccion}`)
  if (!lock.ok) {
    return Response.json(
      { error: `Ya hay una operación IA en curso: ${lock.conflicto?.operacion}` },
      { status: 409 }
    )
  }

  const encoder = new TextEncoder()
  const planActual = contexto.planTrabajo

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const contextoSerializado = serializarContextoParaIA(contexto)
        const estadoRelevante = serializarEstadoActualPlan(planActual, seccion)

        send('status', {
          fase: 'generando',
          mensaje: `Generando sección "${seccion}" con Sonnet...`,
        })
        const seccionJson = await ejecutarSonnetRegeneracion(
          contextoSerializado,
          estadoRelevante,
          seccion,
          instruccionesAdicionales,
          proyectoId,
          userId
        )

        send('status', { fase: 'validacion', mensaje: 'Validando estructura del resultado...' })
        const { data, error } = validarSeccionIndividual(seccion, seccionJson)

        if (error) {
          send('error', { mensaje: `Validación fallida para "${seccion}": ${error}` })
          return
        }

        send('status', { fase: 'persistencia', mensaje: 'Guardando sección validada...' })
        await guardarSeccionIndividual(proyectoId, seccion, data)

        send('done', { seccionGuardada: seccion })
      } catch (error: unknown) {
        console.error('[plan-trabajo/regenerar-seccion] Error:', error)
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
