import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekRange } from '@/lib/utils/timesheetAprobacion'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, motivoRechazo } = body as { accion: 'aprobar' | 'rechazar' | 'borrador'; motivoRechazo?: string }

    if (!accion || !['aprobar', 'rechazar', 'borrador'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida. Use "aprobar", "rechazar" o "borrador"' }, { status: 400 })
    }

    const aprobacion = await prisma.timesheetAprobacion.findUnique({
      where: { id },
    })

    if (!aprobacion) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (accion === 'borrador') {
      if (!['enviado', 'aprobado'].includes(aprobacion.estado)) {
        return NextResponse.json({ error: `Solo se puede volver a borrador desde "enviado" o "aprobado"` }, { status: 400 })
      }
    } else if (aprobacion.estado !== 'enviado') {
      return NextResponse.json({ error: `No se puede ${accion} una semana en estado "${aprobacion.estado}"` }, { status: 400 })
    }

    if (accion === 'rechazar') {
      if (!motivoRechazo || motivoRechazo.trim().length < 10) {
        return NextResponse.json({ error: 'El motivo de rechazo debe tener al menos 10 caracteres' }, { status: 400 })
      }
    }

    // Get week date range for updating RegistroHoras
    const { inicio, fin } = getWeekRange(aprobacion.semana)

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.timesheetAprobacion.update({
        where: { id },
        data: accion === 'borrador'
          ? {
              estado: 'borrador',
              aprobadoPorId: null,
              motivoRechazo: null,
              fechaResolucion: null,
              updatedAt: new Date(),
            }
          : {
              estado: accion === 'aprobar' ? 'aprobado' : 'rechazado',
              aprobadoPorId: session.user.id,
              motivoRechazo: accion === 'rechazar' ? motivoRechazo!.trim() : null,
              fechaResolucion: new Date(),
              updatedAt: new Date(),
            },
        include: {
          usuario: { select: { name: true, email: true } },
        },
      })

      // Mark individual RegistroHoras as aprobado/not aprobado
      await tx.registroHoras.updateMany({
        where: {
          usuarioId: aprobacion.usuarioId,
          fechaTrabajo: { gte: inicio, lte: fin },
          origen: { in: ['oficina', 'campo'] },
        },
        data: {
          aprobado: accion === 'aprobar',
        },
      })

      return result
    })

    const messages: Record<string, string> = {
      aprobar: `Semana ${updated.semana} de ${updated.usuario.name} aprobada`,
      rechazar: `Semana ${updated.semana} de ${updated.usuario.name} rechazada`,
      borrador: `Semana ${updated.semana} de ${updated.usuario.name} devuelta a borrador`,
    }

    return NextResponse.json({
      id: updated.id,
      estado: updated.estado,
      semana: updated.semana,
      usuario: updated.usuario.name,
      message: messages[accion],
    })
  } catch (error) {
    console.error('Error procesando aprobación:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
