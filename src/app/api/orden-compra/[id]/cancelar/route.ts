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

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'aprobada'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede cancelar desde borrador o aprobada' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))

    const data = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: 'cancelada',
        observaciones: body.motivo
          ? `${existing.observaciones ? existing.observaciones + '\n' : ''}[CANCELADA] ${body.motivo}`
          : existing.observaciones,
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
    console.error('Error al cancelar orden de compra:', error)
    return NextResponse.json({ error: 'Error al cancelar orden de compra' }, { status: 500 })
  }
}
