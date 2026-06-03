import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mismos roles que pueden reasignar jornadas.
const ROLES_REASIGNAR = ['admin', 'gestor', 'coordinador']

// GET /api/horas-hombre/jornada/usuarios-asignables — lista de usuarios a los
// que se puede reasignar una jornada (para el selector de responsable).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ROLES_REASIGNAR.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const usuarios = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(usuarios)
}
