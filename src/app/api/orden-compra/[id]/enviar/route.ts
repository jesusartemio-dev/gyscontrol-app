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

    if (!['admin', 'gerente', 'logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para enviar OC' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (existing.estado !== 'aprobada') {
      return NextResponse.json({ error: 'Solo se puede enviar desde estado aprobada' }, { status: 400 })
    }

    const data = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: 'enviada',
        fechaEnvio: new Date(),
        updatedAt: new Date(),
      },
      include: {
        proveedor: true,
        solicitante: { select: { id: true, name: true, email: true } },
        aprobador: { select: { id: true, name: true, email: true } },
        items: true,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al enviar orden de compra:', error)
    return NextResponse.json({ error: 'Error al enviar orden de compra' }, { status: 500 })
  }
}
