import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'gestor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para rechazar recepción' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const observaciones = body.observaciones

    if (!observaciones || typeof observaciones !== 'string' || observaciones.trim().length === 0) {
      return NextResponse.json(
        { error: 'Las observaciones son obligatorias al rechazar' },
        { status: 400 }
      )
    }

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Esta recepción ya fue procesada' },
        { status: 409 }
      )
    }

    await prisma.recepcionPendiente.update({
      where: { id },
      data: {
        estado: 'rechazado',
        confirmadoPorId: session.user.id,
        fechaConfirmacion: new Date(),
        observaciones: observaciones.trim(),
      }
    })

    return NextResponse.json({
      recepcionId: id,
      estado: 'rechazado',
      mensaje: 'Recepción rechazada correctamente'
    })
  } catch (error) {
    console.error('Error al rechazar recepción:', error)
    return NextResponse.json(
      { error: 'Error al rechazar recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
