import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const
const ESTADOS_FINALIZABLES = ['aprobada', 'en_curso'] as const

// PATCH /api/ausencias/:id/finalizar
// Transición: aprobada|en_curso → finalizada (solo admin)
// No revierte planificación ni saldo — la ausencia fue gozada.
export async function PATCH(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: 'Solo admin/administración puede finalizar una ausencia' },
        { status: 403 },
      )
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({ where: { id } })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (!(ESTADOS_FINALIZABLES as readonly string[]).includes(solicitud.estado)) {
      return NextResponse.json(
        { error: `No se puede finalizar una solicitud en estado '${solicitud.estado}'` },
        { status: 422 },
      )
    }

    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.solicitudAusencia.update({
        where: { id },
        data: { estado: 'finalizada', updatedAt: now },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: 'ausencia.finalizada',
          usuarioId: session.user.id,
          descripcion: `Finalizada manualmente por ${session.user.id}`,
          cambios: JSON.stringify({ estadoAnterior: solicitud.estado }),
        },
      })

      return result
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/finalizar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
