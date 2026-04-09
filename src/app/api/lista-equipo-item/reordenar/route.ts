import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { items } = await req.json()
    await prisma.$transaction(
      items.map(({ id, orden }: { id: string; orden: number }) =>
        prisma.listaEquipoItem.update({ where: { id }, data: { orden } })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al reordenar items de lista:', error)
    return NextResponse.json({ error: 'Error al reordenar' }, { status: 500 })
  }
}
