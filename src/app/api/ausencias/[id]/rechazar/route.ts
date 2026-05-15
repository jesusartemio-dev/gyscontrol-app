import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

// PATCH /api/ausencias/:id/rechazar
// Transición: pendiente → rechazada
// Body: { motivo?: string }
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const motivo = typeof body?.motivo === 'string' ? body.motivo.trim() : undefined

    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: { tipoAusencia: { select: { descuentaSaldo: true } } },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const role = session.user.role as string
    const userId = session.user.id
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(role)

    const puedeRechazar =
      isAdmin ||
      solicitud.aprobador1Id === userId ||
      solicitud.aprobador2Id === userId

    if (!puedeRechazar) {
      return NextResponse.json({ error: 'Sin permisos para rechazar' }, { status: 403 })
    }

    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `No se puede rechazar una solicitud en estado '${solicitud.estado}'` },
        { status: 422 },
      )
    }

    const now = new Date()
    const diasHabiles = solicitud.diasHabiles ?? 0

    const updated = await prisma.$transaction(async (tx) => {
      // Return pending days to available if the type deducts balance
      if (solicitud.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
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
          const nuevosPendientes = Math.max(0, saldo.diasPendientes - diasHabiles)
          await tx.saldoAusencia.update({
            where: { id: saldo.id },
            data: {
              diasPendientes: nuevosPendientes,
              diasDisponibles: saldo.diasAsignados - saldo.diasGozados - nuevosPendientes,
              updatedAt: now,
            },
          })
          await tx.movimientoSaldoAusencia.create({
            data: {
              saldoId: saldo.id,
              tipo: 'devolucion',
              dias: diasHabiles,
              motivo: `Devolución por rechazo de solicitud ${id}`,
              referenciaId: id,
              creadoPorId: userId,
            },
          })
        }
      }

      const result = await tx.solicitudAusencia.update({
        where: { id },
        data: {
          estado: 'rechazada',
          motivoRechazo: motivo ?? null,
          rechazadoPorId: userId,
          fechaRechazo: now,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: 'ausencia.rechazada',
          usuarioId: userId,
          descripcion: `Rechazada por ${userId}${motivo ? `: ${motivo}` : ''}`,
          cambios: JSON.stringify({ motivoRechazo: motivo ?? null }),
        },
      })

      return result
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/rechazar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
