import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const reordenarSchema = z.object({
  elementos: z.array(z.object({
    id: z.string(),
    orden: z.number().int().min(0)
  })).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { elementos } = reordenarSchema.parse(body)

    await prisma.$transaction(
      elementos.map(el =>
        prisma.proyectoEdt.update({
          where: { id: el.id },
          data: { orden: el.orden, updatedAt: new Date() }
        })
      )
    )

    return NextResponse.json({ success: true, message: 'EDTs reordenados' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Error reordenando EDTs:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
