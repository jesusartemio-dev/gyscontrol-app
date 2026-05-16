import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'administracion', 'gerente', 'gestor', 'coordinador', 'proyectos']

// GET /api/saldos-ausencia?anio=2026&tipoAusenciaId=...&userId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_ADMIN.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const anio = Number(searchParams.get('anio') ?? new Date().getFullYear())
    const tipoAusenciaId = searchParams.get('tipoAusenciaId') ?? undefined
    const userId = searchParams.get('userId') ?? undefined

    const saldos = await prisma.saldoAusencia.findMany({
      where: {
        anio,
        ...(tipoAusenciaId ? { tipoAusenciaId } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tipoAusencia: { select: { id: true, codigo: true, nombre: true, color: true } },
      },
      orderBy: [{ user: { name: 'asc' } }, { tipoAusencia: { orden: 'asc' } }],
    })

    return NextResponse.json(saldos)
  } catch (error) {
    console.error('[GET /api/saldos-ausencia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
