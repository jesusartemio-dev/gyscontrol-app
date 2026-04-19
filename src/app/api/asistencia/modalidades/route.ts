import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const empleados = await prisma.empleado.findMany({
    where: { activo: true },
    select: {
      id: true,
      modalidadTrabajo: true,
      diasRemoto: true,
      user: { select: { id: true, name: true, email: true } },
      cargo: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json(empleados)
}
