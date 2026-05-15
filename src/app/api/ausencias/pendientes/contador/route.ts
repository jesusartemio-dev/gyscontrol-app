import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_APROBADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_APROBADOR.includes(role)) {
      return NextResponse.json({ count: 0 })
    }

    const userId = session.user.id
    const count = await prisma.solicitudAusencia.count({
      where: {
        estado: 'pendiente',
        OR: [
          { aprobador1Id: userId, fechaAprobacion1: null },
          { aprobador2Id: userId, fechaAprobacion1: { not: null } },
        ],
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[GET /api/ausencias/pendientes/contador]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
