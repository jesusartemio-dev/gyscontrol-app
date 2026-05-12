import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { validarPreRequisitos } from '@/lib/iperc/validarPreRequisitos'
import { generarConIa } from '@/lib/iperc/generarConIa'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad']

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id
  const { role } = session.user

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })

  if (!proyecto) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const esAsignado =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId

  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const enabled = await isIAFeatureEnabled('iperc')
  if (!enabled) {
    return Response.json({ error: 'La funcionalidad de IA para IPERC está deshabilitada' }, { status: 403 })
  }

  const prereqs = await validarPreRequisitos(proyectoId)
  if (!prereqs.cumple) {
    return Response.json(
      { error: 'Prerequisitos incompletos', faltantes: prereqs.faltantes },
      { status: 409 }
    )
  }

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!iperc) {
    return Response.json(
      { error: 'El IPERC no existe — crearlo primero con POST /iperc' },
      { status: 409 }
    )
  }

  const encoder = new TextEncoder()
  const signal = req.signal

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        await generarConIa(proyectoId, userId, send, signal)
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error interno'
        send('error', { mensaje })
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
