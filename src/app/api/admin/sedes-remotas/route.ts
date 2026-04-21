import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente', 'coordinador_rrhh']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado') // pendiente | aprobada | rechazada | reemplazada
  const userId = searchParams.get('userId')

  const sedes = await prisma.ubicacionRemotaPersonal.findMany({
    where: {
      ...(estado ? { estado: estado as any } : {}),
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      aprobadoPor: { select: { id: true, name: true } },
    },
    orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(sedes)
}
