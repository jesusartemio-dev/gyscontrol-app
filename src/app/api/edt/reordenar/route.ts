import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items } = body as { items: { id: string; orden: number }[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de items con id y orden' }, { status: 400 })
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.edt.update({
          where: { id: item.id },
          data: { orden: item.orden },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Error en POST /edt/reordenar:', error)
    return NextResponse.json({ error: 'Error al reordenar EDTs' }, { status: 500 })
  }
}
