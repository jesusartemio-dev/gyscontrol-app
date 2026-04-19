import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_SUPERVISION = ['admin', 'gerente', 'coordinador', 'gestor']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ count: 0 })
  if (!ROLES_SUPERVISION.includes(session.user.role)) {
    return NextResponse.json({ count: 0 })
  }
  const count = await prisma.solicitudTrabajoRemoto.count({ where: { estado: 'pendiente' } })
  return NextResponse.json({ count })
}
