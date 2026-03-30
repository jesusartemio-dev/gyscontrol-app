import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ESTADOS_VALIDOS = ['borrador', 'enviado', 'aprobado', 'en_proceso', 'cerrado', 'rechazado']
const TRANSICIONES: Record<string, string[]> = {
  borrador: ['enviado'],
  enviado: ['aprobado', 'rechazado', 'borrador'],
  aprobado: ['en_proceso', 'rechazado'],
  en_proceso: ['cerrado'],
  rechazado: [],
  cerrado: [],
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const solicitud = await prisma.solicitudRecurso.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
        solicitante: { select: { id: true, name: true } },
        aprobador: { select: { id: true, name: true } },
        items: {
          include: { catalogoRecurso: { select: { id: true, nombre: true, categoria: true, unidad: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    return NextResponse.json(solicitud)
  } catch (error) {
    console.error('Error al obtener solicitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const role = session.user.role
    const esLogistica = ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)

    const solicitud = await prisma.solicitudRecurso.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    // Cambio de estado
    if (body.estado && body.estado !== solicitud.estado) {
      if (!ESTADOS_VALIDOS.includes(body.estado)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      }
      const transicionesPermitidas = TRANSICIONES[solicitud.estado] || []
      if (!transicionesPermitidas.includes(body.estado)) {
        return NextResponse.json(
          { error: `No se puede pasar de "${solicitud.estado}" a "${body.estado}"` },
          { status: 409 }
        )
      }
      // Solo logística puede aprobar/rechazar/poner en proceso
      if (['aprobado', 'rechazado', 'en_proceso', 'cerrado'].includes(body.estado) && !esLogistica) {
        return NextResponse.json({ error: 'Sin permisos para este cambio de estado' }, { status: 403 })
      }
    }

    // Edición de campos base solo en borrador
    const camposEdicion = ['titulo', 'fechaNecesaria', 'observaciones']
    const intentaEditarCampos = camposEdicion.some(c => c in body)
    if (intentaEditarCampos && solicitud.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede editar en estado borrador' }, { status: 409 })
    }

    const updated = await prisma.solicitudRecurso.update({
      where: { id },
      data: {
        ...(body.estado ? { estado: body.estado } : {}),
        ...(body.estado === 'aprobado' ? { aprobadorId: session.user.id, fechaAprobacion: new Date() } : {}),
        ...(body.estado === 'rechazado' ? { motivoRechazo: body.motivoRechazo || null } : {}),
        ...('titulo' in body ? { titulo: body.titulo } : {}),
        ...('fechaNecesaria' in body ? { fechaNecesaria: body.fechaNecesaria ? new Date(body.fechaNecesaria) : null } : {}),
        ...('observaciones' in body ? { observaciones: body.observaciones } : {}),
      },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
        solicitante: { select: { id: true, name: true } },
        aprobador: { select: { id: true, name: true } },
        items: {
          include: { catalogoRecurso: { select: { id: true, nombre: true, categoria: true } } },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar solicitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const solicitud = await prisma.solicitudRecurso.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (solicitud.solicitanteId !== session.user.id && !['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede eliminar en borrador' }, { status: 409 })
    }

    await prisma.solicitudRecurso.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar solicitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
