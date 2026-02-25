import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — Listar notificaciones del usuario autenticado (paginado)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const soloNoLeidas = searchParams.get('noLeidas') === 'true'

    const where: any = { usuarioId: session.user.id }
    if (soloNoLeidas) where.leida = false

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificacion.count({ where }),
    ])

    return NextResponse.json({
      notificaciones,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[notificaciones] Error GET:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PATCH — Marcar notificaciones como leídas
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, todas } = body as { ids?: string[]; todas?: boolean }

    const ahora = new Date()

    if (todas) {
      const result = await prisma.notificacion.updateMany({
        where: { usuarioId: session.user.id, leida: false },
        data: { leida: true, fechaLectura: ahora, updatedAt: ahora },
      })
      return NextResponse.json({ actualizadas: result.count })
    }

    if (ids && ids.length > 0) {
      const result = await prisma.notificacion.updateMany({
        where: { id: { in: ids }, usuarioId: session.user.id, leida: false },
        data: { leida: true, fechaLectura: ahora, updatedAt: ahora },
      })
      return NextResponse.json({ actualizadas: result.count })
    }

    return NextResponse.json({ error: 'Debe enviar ids o todas: true' }, { status: 400 })
  } catch (error) {
    console.error('[notificaciones] Error PATCH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE — Eliminar notificaciones leídas (limpieza)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await prisma.notificacion.deleteMany({
      where: { usuarioId: session.user.id, leida: true },
    })

    return NextResponse.json({ eliminadas: result.count })
  } catch (error) {
    console.error('[notificaciones] Error DELETE:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
