import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { actualizarRegistroAvanceSchema } from '@/lib/validators/registroAvance'
import { REGISTRO_AVANCE_INCLUDE } from '@/lib/services/registroAvance'
import { puedeEscribirEvidencia } from '@/lib/services/evidenciaAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const registro = await prisma.registroAvance.findUnique({
      where: { id },
      include: REGISTRO_AVANCE_INCLUDE,
    })
    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    return NextResponse.json(registro)
  } catch (error) {
    console.error('Error al obtener registro de avance:', error)
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.registroAvance.findUnique({
      where: { id },
      select: {
        autorId: true,
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
    const parsed = actualizarRegistroAvanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const actualizado = await prisma.registroAvance.update({
      where: { id },
      data: { ...parsed.data },
      include: REGISTRO_AVANCE_INCLUDE,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar registro de avance:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.registroAvance.findUnique({
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

    await prisma.registroAvance.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar registro de avance:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
