import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Devuelve la jornada activa más reciente del supervisor (si existe).
// Busca en las últimas 36h para cubrir turnos nocturnos que cruzan la medianoche
// (ej. 7pm–7am: al día siguiente a las 8am la jornada sigue activa).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const hace36h = new Date(Date.now() - 36 * 60 * 60 * 1000)

  const jornada = await prisma.jornadaAsistencia.findFirst({
    where: { supervisorId: session.user.id, iniciadaEn: { gte: hace36h }, activa: true },
    orderBy: { iniciadaEn: 'desc' },
    include: { ubicacion: true },
  })
  return NextResponse.json(jornada)
}
