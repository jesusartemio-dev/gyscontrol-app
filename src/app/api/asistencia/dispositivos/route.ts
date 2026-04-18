import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_SUPERVISION = ['admin', 'gerente', 'coordinador', 'gestor']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'propios'
  const soloPendientes = url.searchParams.get('pendientes') === '1'

  const where: any = {}
  if (scope === 'propios') where.userId = session.user.id
  else if (!ROLES_SUPERVISION.includes(session.user.role))
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  if (soloPendientes) where.aprobado = false

  const data = await prisma.dispositivo.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      aprobadoPor: { select: { id: true, name: true } },
    },
    orderBy: { ultimaVez: 'desc' },
  })
  return NextResponse.json(data)
}
