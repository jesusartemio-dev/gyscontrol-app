import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH /api/cotizacion-equipo-item/reordenar
// Body: { items: [{ id: string, orden: number }] }
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { items } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items requeridos' }, { status: 400 })
    }

    await prisma.$transaction(
      items.map(({ id, orden }: { id: string; orden: number }) =>
        prisma.cotizacionEquipoItem.update({
          where: { id },
          data: { orden, updatedAt: new Date() },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[REORDENAR_COTIZACION_EQUIPO_ITEM]', error)
    return NextResponse.json({ error: 'Error al reordenar' }, { status: 500 })
  }
}
