import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { calcularDiasHabiles } from '@/services/ausencias/calcularDiasHabiles'
import { resolverAprobador1 } from '@/services/ausencias/resolverAprobador'
import { obtenerCalendarioLaboral } from '@/lib/utils/calendarioLaboral'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/ausencias/:id/enviar
// Transición: borrador → pendiente
// Es el endpoint más complejo: valida, calcula días, resuelve aprobador, toca saldo.
export async function PATCH(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    // ── 1. Cargar solicitud con relaciones ────────────────────────────────────
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: {
        tipoAusencia: true,
        adjuntos: { select: { id: true } },
      },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.solicitanteId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // ── 2. Validar estado ─────────────────────────────────────────────────────
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json(
        { error: `Solo se puede enviar desde borrador (estado actual: ${solicitud.estado})` },
        { status: 422 },
      )
    }

    // ── 3. Validar adjuntos si requiereDocumento ──────────────────────────────
    if (solicitud.tipoAusencia.requiereDocumento && solicitud.adjuntos.length === 0) {
      return NextResponse.json(
        {
          error: `El tipo '${solicitud.tipoAusencia.nombre}' requiere al menos un documento adjunto antes de enviar`,
        },
        { status: 422 },
      )
    }

    // ── 4. Validar solapamiento con otras solicitudes activas ─────────────────
    const solapadas = await prisma.solicitudAusencia.findMany({
      where: {
        solicitanteId: session.user.id,
        id: { not: id },
        estado: { in: ['pendiente', 'aprobada', 'en_curso', 'finalizada'] },
        fechaInicio: { lte: solicitud.fechaFin },
        fechaFin: { gte: solicitud.fechaInicio },
      },
      select: { id: true, estado: true, fechaInicio: true, fechaFin: true },
    })

    if (solapadas.length > 0) {
      return NextResponse.json(
        {
          error: 'Las fechas se solapan con una solicitud existente',
          conflictos: solapadas,
        },
        { status: 422 },
      )
    }

    // ── 5. Calcular diasHabiles ───────────────────────────────────────────────
    const calendario = await obtenerCalendarioLaboral('empresa', 'default')
    const calendarioId = calendario?.id as string | undefined

    const diasHabiles = await calcularDiasHabiles(
      solicitud.fechaInicio,
      solicitud.fechaFin,
      solicitud.turnoInicio,
      solicitud.turnoFin,
      solicitud.tipoAusencia.aplicaFinDeSemana,
      calendarioId,
    )

    // ── 6. Validar saldo si descuentaSaldo ────────────────────────────────────
    const anio = solicitud.fechaInicio.getFullYear()

    if (solicitud.tipoAusencia.descuentaSaldo) {
      let saldo = await prisma.saldoAusencia.findUnique({
        where: {
          userId_tipoAusenciaId_anio: {
            userId: solicitud.solicitanteId,
            tipoAusenciaId: solicitud.tipoAusenciaId,
            anio,
          },
        },
      })

      // Si no existe saldo y el tipo no tiene días por defecto, el admin debe acreditarlo primero
      if (!saldo) {
        if (solicitud.tipoAusencia.diasPorDefecto === null) {
          return NextResponse.json(
            {
              error: 'saldo_no_configurado',
              mensaje: 'No hay saldo configurado para este tipo de ausencia. Contacte a Recursos Humanos para que le acrediten saldo antes de solicitar.',
            },
            { status: 422 },
          )
        }
        const diasPorDefecto = solicitud.tipoAusencia.diasPorDefecto
        saldo = await prisma.saldoAusencia.create({
          data: {
            userId: solicitud.solicitanteId,
            tipoAusenciaId: solicitud.tipoAusenciaId,
            anio,
            diasAsignados: diasPorDefecto,
            diasGozados: 0,
            diasPendientes: 0,
            diasDisponibles: diasPorDefecto,
            updatedAt: new Date(),
          },
        })
      }

      if (saldo.diasDisponibles < diasHabiles) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente. Disponibles: ${saldo.diasDisponibles} días, requeridos: ${diasHabiles} días`,
            saldo: {
              diasAsignados: saldo.diasAsignados,
              diasGozados: saldo.diasGozados,
              diasPendientes: saldo.diasPendientes,
              diasDisponibles: saldo.diasDisponibles,
            },
          },
          { status: 422 },
        )
      }
    }

    // ── 7. Resolver aprobador1 ────────────────────────────────────────────────
    const resultAprobador = await prisma.$transaction(async (tx) => {
      return resolverAprobador1(
        solicitud.solicitanteId,
        solicitud.fechaInicio,
        solicitud.fechaFin,
        tx as any,
      )
    })

    const aprobador1Id =
      'aprobador1Id' in resultAprobador ? resultAprobador.aprobador1Id : null
    const requiereAsignacionAprobador = aprobador1Id === null

    // ── 8. Aplicar todo en una transacción ────────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar saldo (diasPendientes) si corresponde
      if (solicitud.tipoAusencia.descuentaSaldo) {
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
          const nuevosPendientes = saldo.diasPendientes + diasHabiles
          const nuevosDisponibles =
            saldo.diasAsignados - saldo.diasGozados - nuevosPendientes

          await tx.saldoAusencia.update({
            where: { id: saldo.id },
            data: {
              diasPendientes: nuevosPendientes,
              diasDisponibles: nuevosDisponibles,
              updatedAt: new Date(),
            },
          })

          await tx.movimientoSaldoAusencia.create({
            data: {
              saldoId: saldo.id,
              tipo: 'consumo',
              dias: diasHabiles,
              motivo: `Solicitud de ${solicitud.tipoAusencia.nombre} enviada a aprobación`,
              referenciaId: id,
              creadoPorId: session.user.id,
            },
          })
        }
      }

      // Transicionar a pendiente
      return tx.solicitudAusencia.update({
        where: { id },
        data: {
          estado: 'pendiente',
          diasHabiles,
          aprobador1Id,
          requiereAsignacionAprobador,
          updatedAt: new Date(),
        },
        include: {
          tipoAusencia: {
            select: { id: true, codigo: true, nombre: true, color: true },
          },
          solicitante: { select: { id: true, name: true, email: true } },
          aprobador1: { select: { id: true, name: true, email: true } },
        },
      })
    })

    return NextResponse.json({
      ...updated,
      aprobadorVia: 'aprobador1Id' in resultAprobador ? (resultAprobador as any).via : null,
      requiereAsignacionAprobador,
    })
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/enviar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
