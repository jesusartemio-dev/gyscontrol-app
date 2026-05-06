import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { actualizarRegistroSeguridadSchema } from '@/lib/validators/registroSeguridad'
import { REGISTRO_INCLUDE } from '@/lib/services/registroSeguridad'
import { puedeEscribirEvidencia } from '@/lib/services/evidenciaSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const registro = await prisma.registroSeguridad.findUnique({
      where: { id },
      include: REGISTRO_INCLUDE,
    })
    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    return NextResponse.json(registro)
  } catch (error) {
    console.error('Error al obtener registro de seguridad:', error)
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.registroSeguridad.findUnique({
      where: { id },
      select: {
        ingenieroId: true,
        tipo: true,
        evidencia: { select: { estado: true, jornada: { select: { estado: true } } } },
      },
    })
    if (!existente) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    if (
      !puedeEscribirEvidencia(
        session.user.role,
        existente.evidencia.jornada.estado,
        existente.evidencia.estado,
      )
    ) {
      return NextResponse.json(
        { error: 'No se puede editar: la evidencia o jornada está cerrada' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const parsed = actualizarRegistroSeguridadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const tipoFinal = parsed.data.tipo ?? existente.tipo
    const actualizado = await prisma.registroSeguridad.update({
      where: { id },
      data: {
        ...parsed.data,
        asistentes:
          tipoFinal === 'charla'
            ? parsed.data.asistentes !== undefined
              ? parsed.data.asistentes
              : undefined
            : null,
      },
      include: REGISTRO_INCLUDE,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar registro de seguridad:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.registroSeguridad.findUnique({
      where: { id },
      select: {
        evidencia: { select: { estado: true, jornada: { select: { estado: true } } } },
      },
    })
    if (!existente) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    if (
      !puedeEscribirEvidencia(
        session.user.role,
        existente.evidencia.jornada.estado,
        existente.evidencia.estado,
      )
    ) {
      return NextResponse.json(
        { error: 'No se puede eliminar: la evidencia o jornada está cerrada' },
        { status: 403 },
      )
    }

    await prisma.registroSeguridad.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar registro de seguridad:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
