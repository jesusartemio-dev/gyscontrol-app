/**
 * API para rechazar un registro de campo
 * PUT /api/horas-hombre/campo/[id]/rechazar
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Obtener registro
    const registro = await prisma.registroHorasCampo.findUnique({
      where: { id },
      include: {
        supervisor: { select: { id: true, name: true, email: true } },
        proyecto: { select: { codigo: true, nombre: true } }
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

    // Actualizar estado
    const registroActualizado = await prisma.registroHorasCampo.update({
      where: { id },
      data: {
        estado: 'rechazado',
        motivoRechazo: motivoRechazo.trim(),
        aprobadoPorId: session.user.id,
        fechaAprobacion: new Date()
      }
    })

    // TODO: Notificar al supervisor
    // await crearNotificacion({
    //   titulo: 'Registro de campo rechazado',
    //   mensaje: `Tu registro de ${registro.proyecto.codigo} fue rechazado: ${motivoRechazo}`,
    //   tipo: 'warning',
    //   prioridad: 'alta',
    //   usuarioId: registro.supervisorId,
    //   entidadTipo: 'registro_horas_campo',
    //   entidadId: id,
    //   accionUrl: '/supervision/registro-campo',
    //   accionTexto: 'Ver registro'
    // })

    console.log(`✅ RECHAZAR CAMPO: Rechazado registro ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Registro rechazado',
      data: {
        registroId: id,
        estado: 'rechazado',
        motivoRechazo: registroActualizado.motivoRechazo
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
