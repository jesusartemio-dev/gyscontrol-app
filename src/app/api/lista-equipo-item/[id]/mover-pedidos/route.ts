// POST /api/lista-equipo-item/[id]/mover-pedidos  { nuevoItemId }
// Al reemplazar un ítem de lista que ya está en un pedido EN BORRADOR (o
// cancelado), la línea del pedido pasa a apuntar al ítem nuevo (código,
// descripción, unidad, marca y ficha de catálogo del nuevo). Sin esto el ítem
// viejo no se podía borrar (tiene pedido), quedaban los dos en la lista y el
// pedido seguía pidiendo el equipo viejo.
// Si hay pedidos ya enviados o más avanzados no mueve nada (409): hay que
// pasarlos a borrador primero.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularCantidadPedida } from '@/lib/utils/cantidadPedidaValidator'

const ESTADOS_MOVIBLES = ['borrador', 'cancelado'] as const
const r3 = (n: number) => Math.round(n * 1000) / 1000

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await context.params
  const { nuevoItemId } = await req.json().catch(() => ({}))
  if (!nuevoItemId || nuevoItemId === id) return NextResponse.json({ error: 'Falta el ítem nuevo' }, { status: 400 })

  const [viejo, nuevo] = await Promise.all([
    prisma.listaEquipoItem.findUnique({ where: { id }, select: { listaId: true } }),
    prisma.listaEquipoItem.findUnique({
      where: { id: nuevoItemId },
      select: { listaId: true, codigo: true, descripcion: true, unidad: true, marca: true, categoria: true, catalogoEquipoId: true, cantidad: true },
    }),
  ])
  if (!viejo || !nuevo) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  if (viejo.listaId !== nuevo.listaId) return NextResponse.json({ error: 'Los ítems no son de la misma lista' }, { status: 400 })

  const lineas = await prisma.pedidoEquipoItem.findMany({
    where: { listaEquipoItemId: id },
    select: { id: true, cantidadPedida: true, pedidoEquipo: { select: { codigo: true, estado: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const bloquean = lineas.filter(l => !(ESTADOS_MOVIBLES as readonly string[]).includes(l.pedidoEquipo.estado))
  if (bloquean.length > 0) {
    const cuales = bloquean.map(l => `${l.pedidoEquipo.codigo} (${l.pedidoEquipo.estado})`).join(', ')
    return NextResponse.json({ error: `Está en ${cuales}: pásalo a borrador antes de reemplazar` }, { status: 409 })
  }

  // La cantidad pedida no puede pasar de la del ítem nuevo (p. ej. 1.41 m → 1 und).
  let restante = nuevo.cantidad
  const movidas: { pedido: string; antes: number; despues: number }[] = []
  for (const l of lineas) {
    const cant = l.pedidoEquipo.estado === 'cancelado' ? l.cantidadPedida : r3(Math.max(0, Math.min(l.cantidadPedida, restante)))
    if (l.pedidoEquipo.estado !== 'cancelado') restante = r3(restante - cant)
    await prisma.pedidoEquipoItem.update({
      where: { id: l.id },
      data: {
        listaEquipoItemId: nuevoItemId,
        codigo: nuevo.codigo,
        descripcion: nuevo.descripcion,
        unidad: nuevo.unidad,
        marca: nuevo.marca,
        categoria: nuevo.categoria,
        catalogoEquipoId: nuevo.catalogoEquipoId,
        cantidadPedida: cant,
      },
    })
    movidas.push({ pedido: l.pedidoEquipo.codigo, antes: l.cantidadPedida, despues: cant })
  }

  await recalcularCantidadPedida(id)
  await recalcularCantidadPedida(nuevoItemId)
  return NextResponse.json({ movidas })
}
