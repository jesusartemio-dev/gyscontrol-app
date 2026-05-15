import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { validarConflictosPlanificacion } from '@/services/ausencias/validarConflictosPlanificacion'
import { materializarPlanificacion } from '@/services/ausencias/materializarPlanificacion'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

// PATCH /api/ausencias/:id/aprobar-2
// Transición: pendiente (nivel 1 aprobado, nivel 2 pendiente) → aprobada
// Body: { desasignarProyectos?: boolean }
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const desasignarProyectos = Boolean(body?.desasignarProyectos)

    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: {
        tipoAusencia: {
          select: {
            aplicaFinDeSemana: true,
            descuentaSaldo: true,
          },
        },
      },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const role = session.user.role as string
    const userId = session.user.id
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(role)

    if (!isAdmin && solicitud.aprobador2Id !== userId) {
      return NextResponse.json({ error: 'Sin permisos para aprobar nivel 2' }, { status: 403 })
    }
    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `La solicitud está en estado '${solicitud.estado}', se requiere estado pendiente` },
        { status: 422 },
      )
    }
    if (solicitud.fechaAprobacion1 === null) {
      return NextResponse.json(
        { error: 'Nivel 1 aún no aprobado. Use /aprobar-1 primero.' },
        { status: 422 },
      )
    }
    if (solicitud.fechaAprobacion2 !== null) {
      return NextResponse.json({ error: 'El nivel 2 ya fue aprobado.' }, { status: 422 })
    }
    // Separation of duties: aprobador2 cannot be the same person as aprobador1
    if (solicitud.aprobador1Id === userId) {
      return NextResponse.json(
        { error: 'La misma persona no puede aprobar ambos niveles.' },
        { status: 422 },
      )
    }

    // Check for conflicts before materialising
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

    if (conflictos.length > 0 && !desasignarProyectos) {
      return NextResponse.json({ error: 'Conflictos de planificación', conflictos }, { status: 409 })
    }

    const now = new Date()
    const diasHabiles = solicitud.diasHabiles ?? 0

    const resultado = await prisma.$transaction(async (tx) => {
      const mat = await materializarPlanificacion(
        id,
        { desasignarProyectos },
        userId,
        tx as any,
      )

      // Move saldo: diasPendientes → diasGozados
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
          const nuevosGozados = saldo.diasGozados + diasHabiles
          const nuevosPendientes = Math.max(0, saldo.diasPendientes - diasHabiles)
          await tx.saldoAusencia.update({
            where: { id: saldo.id },
            data: {
              diasGozados: nuevosGozados,
              diasPendientes: nuevosPendientes,
              diasDisponibles: saldo.diasAsignados - nuevosGozados - nuevosPendientes,
              updatedAt: now,
            },
          })
          await tx.movimientoSaldoAusencia.create({
            data: {
              saldoId: saldo.id,
              tipo: 'consumo',
              dias: diasHabiles,
              motivo: `Aprobación nivel 2 ausencia ${id}`,
              referenciaId: id,
              creadoPorId: userId,
            },
          })
        }
      }

      const updated = await tx.solicitudAusencia.update({
        where: { id },
        data: {
          estado: 'aprobada',
          fechaAprobacion2: now,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: 'ausencia.aprobada_nivel2',
          usuarioId: userId,
          descripcion: `Nivel 2 aprobado por ${userId}. Celdas creadas: ${mat.celdasCreadas}`,
          cambios: JSON.stringify(mat),
        },
      })

      return updated
    })

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/aprobar-2]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
