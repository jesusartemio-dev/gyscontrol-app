import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPreRequisitosMpp } from '@/lib/mpp/validarPreRequisitos'
import { generarMppConIa, type ResultadoGeneracionMpp } from '@/lib/mpp/generarConIa'

export const maxDuration = 120

const TTL_MUTEX_MS = 10 * 60 * 1000
const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad']

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id: proyectoId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 })
  }

  if (!ROLES_CON_ACCESO.includes(session.user.role)) {
    return new Response('Sin permiso para esta operación', { status: 403 })
  }

  const prereq = await validarPreRequisitosMpp(proyectoId)
  if (!prereq.ok) {
    return Response.json({ error: prereq.error, code: prereq.code }, { status: 422 })
  }

  // Mutex: rechazar si hay generación reciente en progreso
  const mppExistente = await prisma.mpp.findUnique({
    where: { proyectoId },
    select: { id: true },
  })

  if (mppExistente) {
    const generacionEnCurso = await prisma.mppGeneracion.findFirst({
      where: {
        mppId: mppExistente.id,
        estado: 'en_progreso',
        createdAt: { gte: new Date(Date.now() - TTL_MUTEX_MS) },
      },
    })

    if (generacionEnCurso) {
      return Response.json(
        { error: 'Ya hay una generación en progreso, esperá a que termine' },
        { status: 409 }
      )
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emitir = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const generator = generarMppConIa(proyectoId)
        let result: ResultadoGeneracionMpp | undefined

        while (true) {
          const next = await generator.next()
          if (next.done) {
            result = next.value
            break
          }
          emitir(next.value)
        }

        if (!result) throw new Error('Generación no retornó resultado')

        await prisma.mppGeneracion.create({
          data: {
            mppId: result.mppId,
            estado: 'completado',
            modelo: result.modelo,
            promptTokens: result.promptTokens,
            outputTokens: result.outputTokens,
            ajustesAplicados: result.ajustesAplicados,
            totalItems: result.itemsCreados,
          },
        })

        emitir({
          type: 'finalizado',
          mppId: result.mppId,
          itemsCreados: result.itemsCreados,
          ajustesAplicados: result.ajustesAplicados,
          ajustesIgnorados: result.ajustesIgnorados,
          resumen: result.resumen,
        })
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error)
        console.error('[mpp generar-ia] Error:', error)
        emitir({ type: 'error', mensaje })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
