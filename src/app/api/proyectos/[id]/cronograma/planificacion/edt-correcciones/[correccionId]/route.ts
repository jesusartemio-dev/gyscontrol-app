import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'

type Ctx = { params: Promise<{ id: string; correccionId: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, correccionId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role, id: userId } = session.user
  const esGestorODirectivo =
    proyecto.gestorId === userId || proyecto.supervisorId === userId || proyecto.liderId === userId || proyecto.comercialId === userId

  if (!ROLES_CRONOGRAMA.includes(role as (typeof ROLES_CRONOGRAMA)[number]) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const correccion = await prisma.proyectoCronogramaEdtCorreccion.findUnique({
    where: { id: correccionId },
    select: { id: true, proyectoId: true },
  })
  if (!correccion || correccion.proyectoId !== proyectoId) {
    return NextResponse.json({ error: 'Corrección no encontrada' }, { status: 404 })
  }

  await prisma.proyectoCronogramaEdtCorreccion.delete({ where: { id: correccionId } })

  return NextResponse.json({ ok: true })
}
