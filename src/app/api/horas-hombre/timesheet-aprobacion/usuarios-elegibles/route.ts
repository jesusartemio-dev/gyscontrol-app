import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

/**
 * GET /api/horas-hombre/timesheet-aprobacion/usuarios-elegibles
 * Devuelve los usuarios que han registrado al menos una hora (oficina o campo)
 * en algún momento. Útil para construir la matriz de timesheets en
 * /supervision/timesheet, donde queremos ver también a quienes no marcaron
 * horas en la semana actual.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const distinct = await prisma.registroHoras.findMany({
      where: { origen: { in: ['oficina', 'campo'] } },
      select: { usuarioId: true },
      distinct: ['usuarioId'],
    })
    const ids = distinct.map(r => r.usuarioId)
    if (ids.length === 0) return NextResponse.json({ usuarios: [] })

    const usuarios = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    console.error('Error obteniendo usuarios elegibles:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
