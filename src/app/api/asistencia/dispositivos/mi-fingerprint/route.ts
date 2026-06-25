import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const dispositivo = await prisma.dispositivo.findFirst({
    where: { userId: session.user.id, aprobado: true },
    select: { fingerprint: true },
    orderBy: { ultimaVez: 'desc' },
  })

  if (!dispositivo) return NextResponse.json({ fingerprint: null })
  return NextResponse.json({ fingerprint: dispositivo.fingerprint })
}
