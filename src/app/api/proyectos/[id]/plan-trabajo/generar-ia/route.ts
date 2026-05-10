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
  PLAN_TRABAJO_OUTPUT_SCHEMA,
} from '@/lib/planTrabajo/prompts/generarPlan'
import type { PlanTrabajoContexto } from '@/types/planTrabajo'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// ─── Helpers internos ───────────────────────────────────────────────────────

async function ejecutarFaseA(
  contexto: PlanTrabajoContexto,
  userId: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const contextoSerializado = serializarContextoParaIA(contexto)
  const inicio = Date.now()

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
  })

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

async function ejecutarFaseB(
  resumenProyecto: string,
  contexto: PlanTrabajoContexto,
  userId: string
): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 16384,
    system: [
      {
        type: 'text',
        text: PLAN_TRABAJO_SYSTEM_INSTRUCCIONES,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: PLAN_TRABAJO_OUTPUT_SCHEMA,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `RESUMEN EJECUTIVO DEL PROYECTO:\n\n${resumenProyecto}\n\nGenera el JSON del Plan de Trabajo.`,
      },
    ],
  })

  const usageRaw = response.usage as unknown as Record<string, number>
  trackUsage({
    userId,
    tipo: 'plan-trabajo.generar',
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
    tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId: contexto.proyecto.id },
  })

  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  // Limpiar markdown si la IA lo incluyó por error
  const jsonLimpio = texto
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  return JSON.parse(jsonLimpio)
}

// ─── Endpoint ───────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id

  // Verificar acceso al proyecto
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

  // Verificar feature flag
  const enabled = await isIAFeatureEnabled('planTrabajo')
  if (!enabled) {
    return Response.json({ error: 'La funcionalidad de IA para Plan de Trabajo está deshabilitada' }, { status: 403 })
  }

  // Cargar contexto completo
  const contexto = await cargarContextoPlanTrabajo(proyectoId)
  if (!contexto) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Verificar prerrequisitos
  if (!contexto.prerrequisitos.puedeGenerar) {
    return Response.json(
      {
        error: 'No se puede generar el Plan de Trabajo',
        bloqueantesFaltantes: contexto.prerrequisitos.bloqueantesFaltantes,
      },
      { status: 409 }
    )
  }

  // Verificar que el PlanTrabajo existe (debe crearse primero con POST /plan-trabajo)
  if (!contexto.planTrabajo) {
    return Response.json(
      { error: 'El Plan de Trabajo no existe — crearlo primero con POST /plan-trabajo' },
      { status: 409 }
    )
  }

  // Mutex: prevenir operaciones IA paralelas en el mismo plan
  const planId = contexto.planTrabajo.id
  const lock = await adquirirLockIA(planId, 'generar')
  if (!lock.ok) {
    const segs = Math.round((Date.now() - lock.conflicto!.iniciadaEn.getTime()) / 1000)
    return Response.json(
      { error: `Ya hay una operación IA en curso (${lock.conflicto?.operacion}), iniciada hace ${segs}s. Esperá a que termine o aguardá 10 min para que expire.` },
      { status: 409 }
    )
  }

  // ─── SSE ───
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Fase A: Haiku resume el contexto
        send('status', { fase: 'A', mensaje: 'Analizando contexto del proyecto con Haiku...' })
        const resumenProyecto = await ejecutarFaseA(contexto, userId)

        // Fase B: Sonnet genera el JSON estructurado
        send('status', { fase: 'B', mensaje: 'Generando Plan de Trabajo con Sonnet...' })
        const planJson = await ejecutarFaseB(resumenProyecto, contexto, userId)

        // Validar secciones con Zod
        send('status', { fase: 'validacion', mensaje: 'Validando estructura del resultado...' })
        const { secciones, errores } = validarSeccionesPlan(planJson)

        // Persistir secciones válidas
        send('status', { fase: 'persistencia', mensaje: 'Guardando secciones validadas...' })
        await guardarSecciones(proyectoId, secciones)

        // Resultado final
        send('done', {
          seccionesGuardadas: Object.keys(secciones),
          seccionesConError: Object.keys(errores),
          errores: Object.keys(errores).length > 0 ? errores : undefined,
        })
      } catch (error: unknown) {
        console.error('[plan-trabajo/generar-ia] Error:', error)
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
