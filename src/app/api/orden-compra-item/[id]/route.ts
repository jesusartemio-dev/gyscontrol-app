import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para editar items de OC' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const item = await prisma.ordenCompraItem.findUnique({
      where: { id },
      include: {
        ordenCompra: { select: { id: true, estado: true, moneda: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    if (item.ordenCompra.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden editar items en OC borrador' }, { status: 400 })
    }

    const precioUnitario = body.precioUnitario !== undefined ? Number(body.precioUnitario) : item.precioUnitario
    const cantidad = body.cantidad !== undefined ? Number(body.cantidad) : item.cantidad

    if (precioUnitario < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 })
    }
    if (cantidad <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
    }

    const costoTotal = precioUnitario * cantidad

    const now = new Date()

    // Actualizar OrdenCompraItem + PedidoEquipoItem + recalcular totales OC
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Actualizar OrdenCompraItem
      const updatedItem = await tx.ordenCompraItem.update({
        where: { id },
        data: {
          precioUnitario,
          cantidad,
          costoTotal,
          updatedAt: now,
        },
      })

      // 2. Actualizar PedidoEquipoItem si está vinculado
      if (item.pedidoEquipoItemId) {
        await tx.pedidoEquipoItem.update({
          where: { id: item.pedidoEquipoItemId },
          data: {
            precioUnitario,
            costoTotal,
            updatedAt: now,
          },
        })
      }

      // 3. Recalcular subtotal/igv/total de la OC
      const allItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: item.ordenCompra.id },
      })

      const subtotal = allItems.reduce((sum, i) => sum + i.costoTotal, 0)
      const igv = item.ordenCompra.moneda !== 'USD' ? subtotal * 0.18 : 0
      const total = subtotal + igv

      await tx.ordenCompra.update({
        where: { id: item.ordenCompra.id },
        data: { subtotal, igv, total, updatedAt: now },
      })

      return updatedItem
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar item de OC:', error)
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 })
  }
}
