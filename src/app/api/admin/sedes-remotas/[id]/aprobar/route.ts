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
  const { radioMetros } = body as { radioMetros?: number }

  const sede = await prisma.ubicacionRemotaPersonal.findUnique({ where: { id } })
  if (!sede) return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  if (sede.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Solo se aprueban sedes pendientes' }, { status: 400 })
  }

  const now = new Date()

  // Transacción: marcar la anterior aprobada como "reemplazada" y aprobar la nueva
  const aprobada = await prisma.$transaction(async (tx) => {
    await tx.ubicacionRemotaPersonal.updateMany({
      where: { userId: sede.userId, estado: 'aprobada' },
      data: { estado: 'reemplazada', vigenciaHasta: now },
    })

    return tx.ubicacionRemotaPersonal.update({
      where: { id },
      data: {
        estado: 'aprobada',
        aprobadoPorId: session.user.id,
        aprobadoEn: now,
        vigenciaDesde: now,
        ...(typeof radioMetros === 'number' && radioMetros > 0 ? { radioMetros } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        aprobadoPor: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json(aprobada)
}
