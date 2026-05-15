import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { validarConflictosPlanificacion } from '@/services/ausencias/validarConflictosPlanificacion'
import { materializarPlanificacion } from '@/services/ausencias/materializarPlanificacion'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

// PATCH /api/ausencias/:id/aprobar-1
// Transición: pendiente (nivel 1 pendiente) → pendiente (nivel 2 pendiente) | aprobada
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
            requiereAprobacion2: true,
            diasUmbralAprobacion2: true,
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

    if (!isAdmin && solicitud.aprobador1Id !== userId) {
      return NextResponse.json({ error: 'Sin permisos para aprobar nivel 1' }, { status: 403 })
    }
    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `La solicitud está en estado '${solicitud.estado}', se requiere estado pendiente` },
        { status: 422 },
      )
    }
    if (solicitud.fechaAprobacion1 !== null) {
      return NextResponse.json(
        { error: 'El nivel 1 ya fue aprobado. Use /aprobar-2 si se requiere nivel 2.' },
        { status: 422 },
      )
    }
    if (!solicitud.aprobador1Id) {
      return NextResponse.json(
        { error: 'No hay aprobador asignado. Use /asignar-aprobador primero.' },
        { status: 422 },
      )
    }

    // Determine if level 2 is required
    const diasHabiles = solicitud.diasHabiles ?? 0
    const requiereNivel2 =
      solicitud.tipoAusencia.requiereAprobacion2 ||
      (solicitud.tipoAusencia.diasUmbralAprobacion2 !== null &&
        diasHabiles > solicitud.tipoAusencia.diasUmbralAprobacion2)

    // Check for conflicts regardless of nivel2 (materialisation happens now or later)
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

    if (requiereNivel2) {
      // Approve nivel 1 but keep pendiente; resolve aprobador2
      const aprobador2 = await prisma.user.findFirst({
        where: {
          role: { in: ['administracion', 'gerente'] },
          id: { notIn: [solicitud.solicitanteId, userId] },
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      })

      const updated = await prisma.solicitudAusencia.update({
        where: { id },
        data: {
          fechaAprobacion1: now,
          aprobador2Id: aprobador2?.id ?? null,
          requiereAsignacionAprobador: aprobador2 === null,
          updatedAt: now,
        },
      })

      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: 'ausencia.aprobada_nivel1',
          usuarioId: userId,
          descripcion: `Nivel 1 aprobado por ${userId}. Pendiente nivel 2.`,
          cambios: JSON.stringify({ aprobador2Id: aprobador2?.id ?? null }),
        },
      })

      return NextResponse.json({
        ...updated,
        requiereNivel2: true,
        aprobador2Asignado: aprobador2 !== null,
      })
    }

    // No nivel 2 — materialise and close
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
              motivo: `Aprobación ausencia ${id}`,
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
          fechaAprobacion1: now,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: 'ausencia.aprobada',
          usuarioId: userId,
          descripcion: `Aprobada por ${userId}. Celdas creadas: ${mat.celdasCreadas}`,
          cambios: JSON.stringify(mat),
        },
      })

      return updated
    })

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/aprobar-1]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
