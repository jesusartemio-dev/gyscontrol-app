import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, motivoRechazo } = body as { accion: 'aprobar' | 'rechazar'; motivoRechazo?: string }

    if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida. Use "aprobar" o "rechazar"' }, { status: 400 })
    }

    const aprobacion = await prisma.timesheetAprobacion.findUnique({
      where: { id },
    })

    if (!aprobacion) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (aprobacion.estado !== 'enviado') {
      return NextResponse.json({ error: `No se puede ${accion} una semana en estado "${aprobacion.estado}"` }, { status: 400 })
    }

    if (accion === 'rechazar') {
      if (!motivoRechazo || motivoRechazo.trim().length < 10) {
        return NextResponse.json({ error: 'El motivo de rechazo debe tener al menos 10 caracteres' }, { status: 400 })
      }
    }

    const updated = await prisma.timesheetAprobacion.update({
      where: { id },
      data: {
        estado: accion === 'aprobar' ? 'aprobado' : 'rechazado',
        aprobadoPorId: session.user.id,
        motivoRechazo: accion === 'rechazar' ? motivoRechazo!.trim() : null,
        fechaResolucion: new Date(),
        updatedAt: new Date(),
      },
      include: {
        usuario: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({
      id: updated.id,
      estado: updated.estado,
      semana: updated.semana,
      usuario: updated.usuario.name,
      message: accion === 'aprobar'
        ? `Semana ${updated.semana} de ${updated.usuario.name} aprobada`
        : `Semana ${updated.semana} de ${updated.usuario.name} rechazada`,
    })
  } catch (error) {
    console.error('Error procesando aprobación:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
