/**
 * API para rechazar un registro de campo
 * PUT /api/horas-hombre/campo/[id]/rechazar
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgresoService } from '@/lib/services/progresoService'
import { limpiarHorasJornadaRechazada } from '@/lib/utils/jornadaCleanup'
import type { RechazarRegistroCampoPayload } from '@/types/registroCampo'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    // Solo gestores, gerentes y admins pueden rechazar
    const rolesPermitidos = ['admin', 'gerente', 'gestor']
    if (!rolesPermitidos.includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para rechazar registros' },
        { status: 403 }
      )
    }

    const body: RechazarRegistroCampoPayload = await request.json()
    const { motivoRechazo } = body

    if (!motivoRechazo || motivoRechazo.trim().length < 10) {
      return NextResponse.json(
        { error: 'Debe proporcionar un motivo de rechazo (mínimo 10 caracteres)' },
        { status: 400 }
      )
    }

    // Obtener registro (con datos para decidir si hay horas que revertir)
    const registro = await prisma.registroHorasCampo.findUnique({
      where: { id },
      select: {
        estado: true,
        fechaCierre: true,
        tareas: { select: { miembros: { select: { registroHorasId: true } } } }
      }
    })

    if (!registro) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    if (registro.estado !== 'pendiente' && registro.estado !== 'aprobado') {
      return NextResponse.json(
        { error: 'Solo se pueden rechazar registros pendientes o aprobados' },
        { status: 400 }
      )
    }

    // Solo hay horas comprometidas en el cronograma si la jornada fue cerrada
    // (cierre suma horas) o aprobada (crea RegistroHoras). Las jornadas creadas
    // por el registro rápido quedan en 'pendiente' sin sumar horas, así que no
    // se debe revertir nada en ese caso.
    const fueAprobada = registro.tareas.some(t =>
      t.miembros.some(m => m.registroHorasId != null)
    )
    const tieneHorasComprometidas = registro.fechaCierre != null || fueAprobada

    // Al rechazar, la jornada vuelve a 'iniciado' (borrador editable) para que el
    // responsable que la originó pueda corregirla y reenviarla, o eliminarla.
    // Se conserva el motivoRechazo como nota de por qué fue devuelta.
    const resultado = await prisma.$transaction(async (tx) => {
      // Revertir horas del cronograma (y RegistroHoras si fue aprobada), igual
      // que el flujo de reabrir, solo si efectivamente se habían comprometido.
      const cleanup = tieneHorasComprometidas
        ? await limpiarHorasJornadaRechazada(tx, id)
        : { tareasAfectadas: [], horasRevertidas: 0, registrosEliminados: 0 }

      await tx.registroHorasCampo.update({
        where: { id },
        data: {
          estado: 'iniciado',
          motivoRechazo: motivoRechazo.trim(),
          aprobadoPorId: session.user.id,
          fechaAprobacion: new Date(),
          // Resetear campos de cierre: vuelve a ser un borrador en curso
          avanceDia: null,
          bloqueos: undefined,
          planSiguiente: null,
          fechaCierre: null
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

    // TODO: Notificar al supervisor
    // await crearNotificacion({
    //   titulo: 'Jornada de campo devuelta',
    //   mensaje: `Tu jornada de ${registro.proyecto.codigo} fue devuelta para edición: ${motivoRechazo}`,
    //   tipo: 'warning',
    //   prioridad: 'alta',
    //   usuarioId: registro.supervisorId,
    //   entidadTipo: 'registro_horas_campo',
    //   entidadId: id,
    //   accionUrl: '/mi-trabajo/mi-jornada',
    //   accionTexto: 'Ver jornada'
    // })

    console.log(`✅ RECHAZAR CAMPO: Jornada ${id} devuelta a 'iniciado' para edición. Horas revertidas: ${resultado.horasRevertidas}, registros eliminados: ${resultado.registrosEliminados}`)

    return NextResponse.json({
      success: true,
      message: 'Jornada devuelta al responsable para edición',
      data: {
        registroId: id,
        estado: 'iniciado',
        motivoRechazo: motivoRechazo.trim()
      }
    })

  } catch (error) {
    console.error('❌ RECHAZAR REGISTRO CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error rechazando registro de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
