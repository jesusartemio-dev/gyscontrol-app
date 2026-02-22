import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    const adjunto = await prisma.cxPAdjunto.findUnique({ where: { id } })
    if (!adjunto) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    await prisma.cxPAdjunto.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar adjunto CxP:', error)
    return NextResponse.json({ error: 'Error al eliminar adjunto' }, { status: 500 })
  }
}
