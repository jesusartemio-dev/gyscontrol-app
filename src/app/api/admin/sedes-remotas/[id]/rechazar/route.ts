import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente', 'coordinador_rrhh']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { motivoRechazo } = body as { motivoRechazo?: string }

  const sede = await prisma.ubicacionRemotaPersonal.findUnique({ where: { id } })
  if (!sede) return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  if (sede.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Solo se rechazan sedes pendientes' }, { status: 400 })
  }

  const rechazada = await prisma.ubicacionRemotaPersonal.update({
    where: { id },
    data: {
      estado: 'rechazada',
      aprobadoPorId: session.user.id,
      aprobadoEn: new Date(),
      motivoRechazo: motivoRechazo || null,
    },
  })

  return NextResponse.json(rechazada)
}
