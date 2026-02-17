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
    const existing = await prisma.hojaDeGastosAdjunto.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    await prisma.hojaDeGastosAdjunto.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar adjunto:', error)
    return NextResponse.json({ error: 'Error al eliminar adjunto' }, { status: 500 })
  }
}
