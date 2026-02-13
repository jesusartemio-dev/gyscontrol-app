import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo gestor, coordinador, gerente o admin pueden aprobar
    const rolesAprobadores = ['admin', 'gerente', 'gestor', 'coordinador']
    if (!rolesAprobadores.includes(session.user.role)) {
      return NextResponse.json({ error: 'No tienes permiso para aprobar anticipos' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.solicitudAnticipo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }

    if (existing.estado !== 'enviado') {
      return NextResponse.json({ error: 'Solo se puede aprobar un anticipo en estado enviado' }, { status: 400 })
    }

    const data = await prisma.solicitudAnticipo.update({
      where: { id },
      data: {
        estado: 'aprobado',
        aprobadorId: session.user.id,
        fechaAprobacion: new Date(),
        montoPendiente: existing.monto,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al aprobar anticipo:', error)
    return NextResponse.json({ error: 'Error al aprobar anticipo' }, { status: 500 })
  }
}
