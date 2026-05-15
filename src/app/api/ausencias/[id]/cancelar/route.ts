import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { revertirPlanificacion } from '@/services/ausencias/revertirPlanificacion'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

// Estados desde los que se puede cancelar
const ESTADOS_CANCELABLES = ['borrador', 'pendiente', 'aprobada', 'en_curso'] as const
type EstadoCancelable = (typeof ESTADOS_CANCELABLES)[number]

// PATCH /api/ausencias/:id/cancelar
// Transición: borrador|pendiente|aprobada|en_curso → cancelada
// Puede cancelar: el solicitante, admin/administracion, o el aprobador N1 asignado
// - borrador/pendiente: sin revertir planificación (no hay celdas)
// - pendiente: devuelve diasPendientes al saldo
// - aprobada/en_curso: devuelve diasGozados al saldo + revierte PlanificacionDia
export async function PATCH(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: { tipoAusencia: { select: { descuentaSaldo: true } } },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const userId = session.user.id
    const role = (session.user as any).role as string
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(role)
    const isAprobador1 = solicitud.aprobador1Id === userId

    if (!isAdmin && solicitud.solicitanteId !== userId && !isAprobador1) {
      return NextResponse.json({ error: 'Sin permisos para cancelar esta solicitud' }, { status: 403 })
    }
    if (!ESTADOS_CANCELABLES.includes(solicitud.estado as EstadoCancelable)) {
      return NextResponse.json(
        {
          error: `No se puede cancelar una solicitud en estado '${solicitud.estado}'.`,
        },
        { status: 422 },
      )
    }

    const now = new Date()
    const diasHabiles = solicitud.diasHabiles ?? 0
    const descuentaSaldo = solicitud.tipoAusencia.descuentaSaldo

    const updated = await prisma.$transaction(async (tx) => {
      // Revert balance depending on current state
      if (descuentaSaldo && diasHabiles > 0) {
        const anio = solicitud.fechaInicio.getFullYear()
        const saldo = await tx.saldoAusencia.findUnique({
          where: {
            userId_tipoAusenciaId_anio: {
              userId: solicitud.solicitanteId,
              tipoAusenciaId: solicitud.tipoAusenciaId,
              anio,
            },
          },
        })

        if (saldo) {
          let nuevosPendientes = saldo.diasPendientes
          let nuevosGozados = saldo.diasGozados

          if (solicitud.estado === 'pendiente') {
            // Days were held as pending — return them
            nuevosPendientes = Math.max(0, saldo.diasPendientes - diasHabiles)
          } else {
            // aprobada / en_curso: days already moved to gozados — return them
            nuevosGozados = Math.max(0, saldo.diasGozados - diasHabiles)
          }

          await tx.saldoAusencia.update({
            where: { id: saldo.id },
            data: {
              diasPendientes: nuevosPendientes,
              diasGozados: nuevosGozados,
              diasDisponibles: saldo.diasAsignados - nuevosGozados - nuevosPendientes,
              updatedAt: now,
            },
          })
          await tx.movimientoSaldoAusencia.create({
            data: {
              saldoId: saldo.id,
              tipo: 'devolucion',
              dias: diasHabiles,
              motivo: `Devolución por cancelación de solicitud ${id}`,
              referenciaId: id,
              creadoPorId: userId,
            },
          })
        }
      }

      // Revert planning cells for approved/in-progress absences
      if (solicitud.estado === 'aprobada' || solicitud.estado === 'en_curso') {
        await revertirPlanificacion(id, tx as any)
      }

      return tx.solicitudAusencia.update({
        where: { id },
        data: { estado: 'cancelada', updatedAt: now },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/cancelar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
