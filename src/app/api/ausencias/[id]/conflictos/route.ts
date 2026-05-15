import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { validarConflictosPlanificacion } from '@/services/ausencias/validarConflictosPlanificacion'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

// GET /api/ausencias/:id/conflictos
// Returns scheduling conflicts for an absence request (before approval).
export async function GET(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: { tipoAusencia: { select: { aplicaFinDeSemana: true } } },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const role = session.user.role as string
    const userId = session.user.id
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(role)
    const canView =
      isAdmin ||
      solicitud.solicitanteId === userId ||
      solicitud.aprobador1Id === userId ||
      solicitud.aprobador2Id === userId

    if (!canView) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const conflictos = await prisma.$transaction(async (tx) => {
      return validarConflictosPlanificacion(
        solicitud.solicitanteId,
        solicitud.fechaInicio,
        solicitud.fechaFin,
        solicitud.turnoInicio,
        solicitud.turnoFin,
        solicitud.tipoAusencia.aplicaFinDeSemana,
        tx as any,
      )
    })

    return NextResponse.json({ conflictos })
  } catch (error) {
    console.error('[GET /api/ausencias/:id/conflictos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
