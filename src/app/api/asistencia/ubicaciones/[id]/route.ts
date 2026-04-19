import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente']

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    const ubicacion = await prisma.ubicacion.update({
      where: { id },
      data: {
        nombre: body.nombre,
        tipo: body.tipo,
        direccion: body.direccion,
        latitud: body.latitud != null ? parseFloat(body.latitud) : undefined,
        longitud: body.longitud != null ? parseFloat(body.longitud) : undefined,
        radioMetros: body.radioMetros,
        proyectoId: body.proyectoId ?? null,
        activo: body.activo,
        toleranciaMinutos: body.toleranciaMinutos,
        limiteTardeMinutos: body.limiteTardeMinutos,
        horaIngreso: body.horaIngreso || null,
        horaSalida: body.horaSalida || null,
      },
    })
    return NextResponse.json(ubicacion)
  } catch (error) {
    console.error('[PUT /asistencia/ubicaciones/[id]]', error)
    return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.ubicacion.update({ where: { id }, data: { activo: false } })
    return NextResponse.json({ message: 'Ubicación desactivada' })
  } catch (error) {
    console.error('[DELETE /asistencia/ubicaciones/[id]]', error)
    return NextResponse.json({ message: 'Error al desactivar' }, { status: 500 })
  }
}
