import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Devuelve la jornada activa del supervisor actual (si existe) para el día.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const jornada = await prisma.jornadaAsistencia.findFirst({
    where: { supervisorId: session.user.id, fecha: hoy, activa: true },
    include: { ubicacion: true },
  })
  return NextResponse.json(jornada)
}
