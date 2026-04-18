import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const jornada = await prisma.jornadaAsistencia.findUnique({
    where: { id },
    include: {
      ubicacion: true,
      asistencias: {
        orderBy: { fechaHora: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          dispositivo: { select: { nombre: true, plataforma: true, modelo: true, aprobado: true } },
        },
      },
    },
  })
  if (!jornada) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })
  return NextResponse.json(jornada)
}
