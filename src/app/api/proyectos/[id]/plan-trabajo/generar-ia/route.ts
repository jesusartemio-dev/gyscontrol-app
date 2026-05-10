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
  PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_A,
  PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_B,
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
  })
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

async function ejecutarFaseBLote(
  loteId: 'A' | 'B',
  schema: string,
  resumenProyecto: string,
  contexto: PlanTrabajoContexto,
  userId: string
): Promise<Record<string, unknown>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const inicio = Date.now()

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
    messages: [
      {
        role: 'user',
        content: `RESUMEN EJECUTIVO DEL PROYECTO:\n\n${resumenProyecto}\n\nGenera el Plan de Trabajo según el lote indicado. Devolvé ÚNICAMENTE el JSON sin markdown:\n\n${schema}`,
      },
    ],
  })

  const usageRaw = response.usage as unknown as Record<string, number>
  console.log(`[generar-ia] FaseBLote${loteId}: stop_reason=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens} cache_create=${usageRaw.cache_creation_input_tokens ?? 0} cache_read=${usageRaw.cache_read_input_tokens ?? 0} ms=${Date.now()-inicio}`)

  trackUsage({
    userId,
    tipo: `plan-trabajo.lote${loteId}`,
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    tokensCacheCreation: usageRaw.cache_creation_input_tokens ?? 0,
    tokensCacheRead: usageRaw.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId: contexto.proyecto.id },
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Lote ${loteId} excede el límite de tokens — el contenido es demasiado extenso`)
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

  return JSON.parse(jsonLimpio) as Record<string, unknown>
}

async function ejecutarFaseB(
  resumenProyecto: string,
  contexto: PlanTrabajoContexto,
  userId: string,
  onLoteADone: () => void,
  onLoteBDone: () => void,
): Promise<{ secciones: Record<string, unknown>; erroresLote: string[] }> {
  const [resultadoA, resultadoB] = await Promise.allSettled([
    ejecutarFaseBLote('A', PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_A, resumenProyecto, contexto, userId)
      .then(data => { onLoteADone(); return data }),
    ejecutarFaseBLote('B', PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_B, resumenProyecto, contexto, userId)
      .then(data => { onLoteBDone(); return data }),
  ])

  const secciones: Record<string, unknown> = {}
  const erroresLote: string[] = []

  if (resultadoA.status === 'fulfilled') {
    Object.assign(secciones, resultadoA.value)
  } else {
    console.error('[generar-ia] LoteA FALLÓ:', resultadoA.reason)
    erroresLote.push('loteA')
  }

  if (resultadoB.status === 'fulfilled') {
    Object.assign(secciones, resultadoB.value)
  } else {
    console.error('[generar-ia] LoteB FALLÓ:', resultadoB.reason)
    erroresLote.push('loteB')
  }

  return { secciones, erroresLote }
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
  console.log(`[generar-ia] Stream creado — planId=${planId} proyectoId=${proyectoId}`)

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[generar-ia] start() iniciado`)
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Fase A: Haiku resume el contexto
        send('status', { fase: 'A', mensaje: 'Analizando contexto del proyecto...', progreso: 5 })
        const resumenProyecto = await ejecutarFaseA(contexto, userId)
        console.log(`[generar-ia] FaseA: resumen generado — ${resumenProyecto.length} chars`)

        // Fase B: Sonnet genera 2 lotes en paralelo
        send('status', { fase: 'B', mensaje: 'Generando secciones con IA...', progreso: 20 })

        const { secciones: seccionesBrutas, erroresLote } = await ejecutarFaseB(
          resumenProyecto,
          contexto,
          userId,
          () => send('status', { fase: 'loteA', mensaje: 'Lote A completado', progreso: 55 }),
          () => send('status', { fase: 'loteB', mensaje: 'Lote B completado', progreso: 75 }),
        )

        if (Object.keys(seccionesBrutas).length === 0) {
          throw new Error('Todos los lotes fallaron en la generación')
        }

        // Validar secciones con Zod
        send('status', { fase: 'validacion', mensaje: 'Validando estructura del resultado...', progreso: 85 })
        const { secciones, errores } = validarSeccionesPlan(seccionesBrutas)
        const todosLosErrores = [...erroresLote, ...Object.keys(errores)]
        console.log(`[generar-ia] Validación: OK=[${Object.keys(secciones).join(',')}] ERR=[${todosLosErrores.join(',')}]`)

        // Persistir secciones válidas
        send('status', { fase: 'persistencia', mensaje: 'Guardando secciones en la base de datos...', progreso: 97 })
        await guardarSecciones(proyectoId, secciones)
        console.log(`[generar-ia] Guardado OK — ${Object.keys(secciones).length} secciones`)

        // Resultado final
        send('done', {
          seccionesGuardadas: Object.keys(secciones),
          seccionesConError: todosLosErrores,
          errores: todosLosErrores.length > 0 ? { ...errores } : undefined,
        })
        console.log(`[generar-ia] done enviado`)
      } catch (error: unknown) {
        console.error('[generar-ia] ERROR en start():', error)
        const mensaje = error instanceof Error ? error.message : 'Error interno'
        send('error', { mensaje })
      } finally {
        console.log(`[generar-ia] finally: liberando mutex planId=${planId}`)
        await liberarLockIA(planId)
        controller.close()
        console.log(`[generar-ia] finally: stream cerrado`)
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
