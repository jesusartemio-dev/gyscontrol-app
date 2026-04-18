import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const jornada = await prisma.jornadaAsistencia.findUnique({ where: { id } })
  if (!jornada) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })
  if (jornada.supervisorId !== session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const cerrada = await prisma.jornadaAsistencia.update({
    where: { id },
    data: { activa: false, cerradaEn: new Date() },
  })
  return NextResponse.json(cerrada)
}
