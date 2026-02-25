import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — Conteo de notificaciones no leídas del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const noLeidas = await prisma.notificacion.count({
      where: { usuarioId: session.user.id, leida: false },
    })

    return NextResponse.json({ noLeidas })
  } catch (error) {
    console.error('[notificaciones/conteo] Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
