import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/agente/conversaciones - Lista conversaciones del usuario
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)

  const conversaciones = await prisma.agenteConversacion.findMany({
    where: { userId, archivada: false },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titulo: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { mensajes: true } },
    },
  })

  return NextResponse.json(conversaciones)
}

// POST /api/agente/conversaciones - Crea conversación nueva
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  const body = await request.json()

  const conversacion = await prisma.agenteConversacion.create({
    data: {
      userId,
      titulo: body.titulo || 'Nueva conversación',
    },
  })

  return NextResponse.json(conversacion)
}
