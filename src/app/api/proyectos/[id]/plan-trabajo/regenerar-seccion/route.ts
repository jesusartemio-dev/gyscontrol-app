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
import { serializarContextoParaIA, serializarEstadoActualPlan, buildDirectivaCronograma, construirBloqueHechosEtapa1 } from '@/lib/planTrabajo/contextoIA'
import { validarSeccionIndividual } from '@/lib/planTrabajo/validarSecciones'
import { guardarSeccionIndividual, guardarSeccionesCalculadas } from '@/lib/planTrabajo/guardarSecciones'
import { PLAN_TRABAJO_SYSTEM_INSTRUCCIONES } from '@/lib/planTrabajo/prompts/generarPlan'
import { buildPromptRegeneracion } from '@/lib/planTrabajo/prompts/regenerarSeccion'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import { calcularDatosEtapa1 } from '@/lib/planTrabajo/calcularDatos'
import { esSeccionEtapa1, etapa1Completa } from '@/lib/planTrabajo/etapas'
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

// ─── Helper — Etapa 2 (redacción IA) ───────────────────────────────────────

const MAX_TOKENS_POR_SECCION: Partial<Record<SeccionRegenerable, number>> = {
  alcanceDetallado: 16000,
}

async function ejecutarSonnetRegeneracion(
  contextoSerializado: string,
  estadoRelevante: string,
  hechosEtapa1: string,
  seccion: SeccionRegenerable,
  instruccionesAdicionales: string | undefined,
  proyectoId: string,
  userId: string,
  directivaExtra = ''
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
    hechosEtapa1,
    ...(directivaExtra ? ['', directivaExtra] : []),
    '',
    '=== SECCIONES RELEVANTES DEL PLAN ACTUAL ===',
    estadoRelevante,
  ].join('\n')

  // Reintenta 1 vez con un presupuesto de tokens mayor si la salida se trunca —
  // nunca se persiste el JSON reparado de una respuesta truncada (informe §4.4).
  const MAX_REINTENTOS_TRUNCADO = 1
  let maxTokens = MAX_TOKENS_POR_SECCION[seccion] ?? 8192
  let ultimoStopReason: string | null | undefined = null

  for (let intento = 0; intento <= MAX_REINTENTOS_TRUNCADO; intento++) {
    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: maxTokens,
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
      metadata: { proyectoId, seccion, intento },
    })

    ultimoStopReason = response.stop_reason

    if (response.stop_reason === 'max_tokens') {
      if (intento < MAX_REINTENTOS_TRUNCADO) {
        maxTokens = Math.min(maxTokens * 2, 16000)
        console.warn(`[regenerar-seccion] ${seccion}: truncada por max_tokens, reintentando con max_tokens=${maxTokens}`)
        continue
      }
      break
    }

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    return parseJsonIA(texto)
  }

  throw new Error(
    `Sección "${seccion}" excede el límite de tokens incluso tras reintentar (stop_reason=${ultimoStopReason}, max_tokens=${maxTokens})`
  )
}

// ─── Endpoint ───────────────────────────────────────────────────────────────

// POST /api/proyectos/[id]/plan-trabajo/regenerar-seccion
// Punto de entrada único para el botón "↻" de cada sección: si la sección es
// de Etapa 1 (personalAsignado/matrizRaci/histogramas/cronogramaResumen/referencias)
// se RECALCULA sin IA (mismo cálculo determinista de calcular-datos); si es de
// Etapa 2 se REGENERA con IA, recibiendo los hechos de Etapa 1 como inmutables.
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

  if (seccion === 'responsabilidades') {
    return Response.json(
      { error: '"responsabilidades" es texto fijo de la plantilla — ya no se genera ni se recalcula.' },
      { status: 400 }
    )
  }

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
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']
  const esGestorODirectivo =
    proyectoBase.gestorId === userId ||
    proyectoBase.supervisorId === userId ||
    proyectoBase.liderId === userId ||
    proyectoBase.comercialId === userId

  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const esEtapa1 = esSeccionEtapa1(seccion)

  // La Etapa 1 es cálculo determinista — no depende del feature flag de IA.
  if (!esEtapa1) {
    const enabled = await isIAFeatureEnabled('planTrabajo')
    if (!enabled) {
      return Response.json(
        { error: 'La funcionalidad de IA para Plan de Trabajo está deshabilitada' },
        { status: 403 }
      )
    }
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

  if (!esEtapa1 && !etapa1Completa(contexto.planTrabajo.bloquesCompletitud as Record<string, boolean> | null)) {
    return Response.json(
      { error: 'Falta calcular la Etapa 1 (Generar datos) antes de redactar con IA.' },
      { status: 409 }
    )
  }

  const planId = contexto.planTrabajo.id
  const planActual = contexto.planTrabajo
  const lock = await adquirirLockIA(planId, `${esEtapa1 ? 'recalcular' : 'regenerar'}:${seccion}`)
  if (!lock.ok) {
    return Response.json(
      { error: `Ya hay una operación en curso: ${lock.conflicto?.operacion}` },
      { status: 409 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        if (esEtapa1) {
          send('status', { fase: 'calculando', mensaje: `Recalculando "${seccion}" (sin IA)...` })
          const { data, advertencias } = calcularDatosEtapa1(contexto)
          await guardarSeccionesCalculadas(proyectoId, {
            personalAsignado: data.personalAsignado,
            matrizRaci: data.matrizRaci,
            histogramas: data.histogramas,
            cronogramaResumen: data.cronogramaResumen,
            referencias: data.referencias,
          })
          send('done', { seccionGuardada: seccion, calculado: true, advertencias })
          return
        }

        const contextoSerializado = serializarContextoParaIA(contexto)
        const estadoRelevante = serializarEstadoActualPlan(planActual, seccion)
        const hechosEtapa1 = construirBloqueHechosEtapa1(planActual)

        // Para alcanceDetallado: inyectar la directiva estructurada del cronograma
        const directivaCronograma =
          seccion === 'alcanceDetallado' && contexto.cronograma.cronogramaSeleccionado
            ? buildDirectivaCronograma(contexto.cronograma.cronogramaSeleccionado)
            : ''

        send('status', {
          fase: 'generando',
          mensaje: `Generando sección "${seccion}" con Sonnet...`,
        })
        const seccionJson = await ejecutarSonnetRegeneracion(
          contextoSerializado,
          estadoRelevante,
          hechosEtapa1,
          seccion,
          instruccionesAdicionales,
          proyectoId,
          userId,
          directivaCronograma
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
