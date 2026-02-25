import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: listaId } = await params

    // 1. Eventos directos de la lista
    const eventosLista = await prisma.eventoTrazabilidad.findMany({
      where: { listaEquipoId: listaId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaEvento: 'asc' },
    })

    // 2. Buscar pedidos derivados de esta lista
    const pedidos = await prisma.pedidoEquipo.findMany({
      where: { listaId },
      select: { id: true, codigo: true },
    })
    const pedidoIds = pedidos.map(p => p.id)

    // 3. Eventos de pedidos (OC generada, recepciones, entregas)
    const eventosPedidos = pedidoIds.length > 0
      ? await prisma.eventoTrazabilidad.findMany({
          where: { pedidoEquipoId: { in: pedidoIds } },
          include: { user: { select: { name: true } } },
          orderBy: { fechaEvento: 'asc' },
        })
      : []

    // 4. Combinar y deduplicar por id, ordenar cronológicamente
    const todosEventos = [...eventosLista, ...eventosPedidos]
    const eventosMap = new Map<string, typeof todosEventos[0]>()
    for (const e of todosEventos) {
      eventosMap.set(e.id, e)
    }
    const eventos = Array.from(eventosMap.values()).sort(
      (a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
    )

    return NextResponse.json({ eventos })
  } catch (error) {
    console.error('[timeline] Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
