import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !tieneRol(session, ROLES_ADMIN)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const usuarios = await prisma.user.findMany({
    where: { empleado: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastLoginAt: true,
    },
    orderBy: [{ name: 'asc' }],
  })

  return NextResponse.json({ total: usuarios.length, usuarios })
}
