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

    // Solo gerente o admin pueden marcar como pagado
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No tienes permiso para registrar pagos' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.solicitudAnticipo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }

    if (existing.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se puede pagar un anticipo aprobado' }, { status: 400 })
    }

    const data = await prisma.solicitudAnticipo.update({
      where: { id },
      data: {
        estado: 'pagado',
        fechaPago: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al registrar pago:', error)
    return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
  }
}
