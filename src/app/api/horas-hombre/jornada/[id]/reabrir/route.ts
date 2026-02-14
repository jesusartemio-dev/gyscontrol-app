/**
 * API para reabrir una jornada rechazada
 * PUT /api/horas-hombre/jornada/[id]/reabrir
 *
 * Vuelve la jornada a estado 'iniciado' para que el supervisor la edite.
 * Revierte las horas del cronograma y elimina RegistroHoras si fue aprobada.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgresoService } from '@/lib/services/progresoService'
import { limpiarHorasJornadaRechazada } from '@/lib/utils/jornadaCleanup'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: jornadaId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        estado: true,
        supervisorId: true,
        proyecto: { select: { codigo: true } }
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Solo el supervisor creador puede reabrir
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el supervisor que creó la jornada puede reabrirla' },
        { status: 403 }
      )
    }

    if (jornada.estado !== 'rechazado') {
      return NextResponse.json(
        { error: 'Solo se pueden reabrir jornadas rechazadas' },
        { status: 400 }
      )
    }

    // Ejecutar limpieza de horas + cambio de estado en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const cleanup = await limpiarHorasJornadaRechazada(tx, jornadaId)

      // Volver a estado iniciado, resetear campos de cierre
      await tx.registroHorasCampo.update({
        where: { id: jornadaId },
        data: {
          estado: 'iniciado',
          motivoRechazo: null,
          avanceDia: null,
          bloqueos: undefined,
          planSiguiente: null,
          fechaAprobacion: null,
          aprobadoPorId: null
        }
      })

      return cleanup
    })

    // Actualizar progreso de tareas afectadas (fuera de la transacción)
    for (const tareaId of resultado.tareasAfectadas) {
      try {
        await ProgresoService.actualizarProgresoTarea(tareaId)
      } catch (err) {
        console.error(`⚠️ Error actualizando progreso tarea ${tareaId}:`, err)
      }
    }

    console.log(`✅ JORNADA CAMPO: Reabierta jornada ${jornadaId} del proyecto ${jornada.proyecto.codigo}. Horas revertidas: ${resultado.horasRevertidas}, registros eliminados: ${resultado.registrosEliminados}`)

    return NextResponse.json({
      success: true,
      message: 'Jornada reabierta correctamente',
      data: {
        jornadaId,
        horasRevertidas: resultado.horasRevertidas,
        registrosEliminados: resultado.registrosEliminados
      }
    })

  } catch (error) {
    console.error('❌ REABRIR JORNADA Error:', error)
    return NextResponse.json(
      { error: 'Error reabriendo jornada', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
