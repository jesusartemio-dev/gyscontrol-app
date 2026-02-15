import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.gastoAdjunto.findUnique({
      where: { id },
      include: {
        gastoLinea: {
          include: { hojaDeGastos: { select: { estado: true } } },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(existing.gastoLinea.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'No se pueden eliminar adjuntos en este estado' }, { status: 400 })
    }

    await prisma.gastoAdjunto.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar adjunto:', error)
    return NextResponse.json({ error: 'Error al eliminar adjunto' }, { status: 500 })
  }
}
