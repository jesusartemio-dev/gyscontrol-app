import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_APROBACION = ['admin', 'gerente', 'coordinador', 'gestor']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_APROBACION.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const aprobado = body.aprobado !== false

  const dispositivo = await prisma.dispositivo.update({
    where: { id },
    data: aprobado
      ? {
          aprobado: true,
          aprobadoPorId: session.user.id,
          aprobadoEn: new Date(),
        }
      : { aprobado: false, aprobadoPorId: null, aprobadoEn: null },
  })
  return NextResponse.json(dispositivo)
}
