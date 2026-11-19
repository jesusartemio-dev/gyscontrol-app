// POST /api/pedido-equipo/[id]/completar-pendiente
// Pedido en borrador: lleva cada ítem que viene de una lista a lo que falta
// pedir de ese ítem (cantidad de la lista − lo pedido en OTROS pedidos), en un
// solo paso. Para corregir pedidos que salieron "1 de 3" sin editar ítem por ítem.
// { simular: true } devuelve los cambios sin guardarlos.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularCantidadPedida } from '@/lib/utils/cantidadPedidaValidator'

const r3 = (n: number) => Math.round(n * 1000) / 1000

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const simular = body?.simular === true

  const pedido = await prisma.pedidoEquipo.findUnique({
    where: { id },
    select: {
      estado: true,
      pedidoEquipoItem: {
        select: {
          id: true, codigo: true, cantidadPedida: true, listaEquipoItemId: true,
          listaEquipoItem: { select: { cantidad: true } },
        },
      },
    },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado !== 'borrador') {
    return NextResponse.json({ error: 'Solo se puede completar un pedido en borrador. Retrocédelo primero.' }, { status: 409 })
  }

  const cambios: { id: string; codigo: string; antes: number; despues: number }[] = []
  for (const it of pedido.pedidoEquipoItem) {
    if (!it.listaEquipoItemId || !it.listaEquipoItem) continue
    const otros = await prisma.pedidoEquipoItem.aggregate({
      where: { listaEquipoItemId: it.listaEquipoItemId, id: { not: it.id } },
      _sum: { cantidadPedida: true },
    })
    const tope = r3(it.listaEquipoItem.cantidad - (otros._sum.cantidadPedida ?? 0))
    if (tope > r3(it.cantidadPedida)) cambios.push({ id: it.id, codigo: it.codigo, antes: it.cantidadPedida, despues: tope })
  }

  if (!simular) {
    for (const c of cambios) {
      const item = await prisma.pedidoEquipoItem.update({
        where: { id: c.id },
        data: { cantidadPedida: c.despues },
        select: { listaEquipoItemId: true },
      })
      if (item.listaEquipoItemId) await recalcularCantidadPedida(item.listaEquipoItemId)
    }
  }

  return NextResponse.json({ cambios, simulado: simular })
}
