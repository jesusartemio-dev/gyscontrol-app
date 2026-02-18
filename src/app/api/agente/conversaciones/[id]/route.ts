import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/agente/conversaciones/[id] - Retorna conversación con mensajes
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as { id: string }).id

  const conversacion = await prisma.agenteConversacion.findFirst({
    where: { id },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!conversacion) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }

  // Authorization: general conversations are private to the owner
  if (!conversacion.cotizacionId && conversacion.userId !== userId) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }

  return NextResponse.json(conversacion)
}

// DELETE /api/agente/conversaciones/[id] - Archiva la conversación
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as { id: string }).id

  await prisma.agenteConversacion.updateMany({
    where: { id, userId },
    data: { archivada: true },
  })

  return NextResponse.json({ ok: true })
}
