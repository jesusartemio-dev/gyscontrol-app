import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEBOUNCE_MINUTES = 15

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string
    const now = new Date()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActivityAt: true },
    })

    if (user?.lastActivityAt) {
      const diffMs = now.getTime() - new Date(user.lastActivityAt).getTime()
      const diffMinutes = diffMs / (1000 * 60)
      if (diffMinutes < DEBOUNCE_MINUTES) {
        return NextResponse.json({ updated: false })
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: now },
    })

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error('[Activity Heartbeat] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
