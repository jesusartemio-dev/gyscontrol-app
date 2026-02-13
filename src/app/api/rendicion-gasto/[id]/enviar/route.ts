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
    const existing = await prisma.rendicionGasto.findUnique({
      where: { id },
      include: { lineas: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    if (!['borrador', 'rechazado'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede enviar una rendición en estado borrador o rechazado' }, { status: 400 })
    }

    if (existing.lineas.length === 0) {
      return NextResponse.json({ error: 'Debe agregar al menos una línea de gasto antes de enviar' }, { status: 400 })
    }

    const data = await prisma.rendicionGasto.update({
      where: { id },
      data: {
        estado: 'enviado',
        fechaEnvio: new Date(),
        comentarioRechazo: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al enviar rendición:', error)
    return NextResponse.json({ error: 'Error al enviar rendición' }, { status: 500 })
  }
}
