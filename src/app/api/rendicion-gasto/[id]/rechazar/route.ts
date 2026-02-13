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

    const rolesAprobadores = ['admin', 'gerente', 'gestor', 'coordinador']
    if (!rolesAprobadores.includes(session.user.role)) {
      return NextResponse.json({ error: 'No tienes permiso para rechazar rendiciones' }, { status: 403 })
    }

    const { id } = await params
    const { comentario } = await req.json()

    const existing = await prisma.rendicionGasto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    if (existing.estado !== 'enviado') {
      return NextResponse.json({ error: 'Solo se puede rechazar una rendición en estado enviado' }, { status: 400 })
    }

    const data = await prisma.rendicionGasto.update({
      where: { id },
      data: {
        estado: 'rechazado',
        aprobadorId: session.user.id,
        comentarioRechazo: comentario || 'Rechazado',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al rechazar rendición:', error)
    return NextResponse.json({ error: 'Error al rechazar rendición' }, { status: 500 })
  }
}
