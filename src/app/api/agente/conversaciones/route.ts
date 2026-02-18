import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/agente/conversaciones - Lista conversaciones del usuario
// ?cotizacionId=xxx → filtra por cotización; sin param → solo generales (sin cotización)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
  const cotizacionId = url.searchParams.get('cotizacionId')

  const where: Record<string, unknown> = { archivada: false }
  if (cotizacionId) {
    // Shared: all users see cotización conversations
    where.cotizacionId = cotizacionId
  } else {
    // Private: only user's general conversations
    where.userId = userId
    where.cotizacionId = null
  }

  const conversaciones = await prisma.agenteConversacion.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titulo: true,
      cotizacionId: true,
      updatedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
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
      cotizacionId: body.cotizacionId || null,
    },
  })

  return NextResponse.json(conversacion)
}
