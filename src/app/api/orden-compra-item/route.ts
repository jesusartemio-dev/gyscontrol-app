import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/orden-compra-item
 * Add items to an existing OC (only in borrador state)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para agregar items a OC' }, { status: 403 })
    }

    const { ordenCompraId, items } = await req.json()

    if (!ordenCompraId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'ordenCompraId y al menos un item son requeridos' }, { status: 400 })
    }

    const oc = await prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      select: { id: true, estado: true, moneda: true },
    })

    if (!oc) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }

    if (oc.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden agregar items en OC borrador' }, { status: 400 })
    }

    const now = new Date()

    const newItems = items.map((item: any) => ({
      ordenCompraId,
      codigo: item.codigo || '',
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoTotal: item.cantidad * item.precioUnitario,
      pedidoEquipoItemId: item.pedidoEquipoItemId || null,
      listaEquipoItemId: item.listaEquipoItemId || null,
      updatedAt: now,
    }))

    await prisma.$transaction(async (tx) => {
      await tx.ordenCompraItem.createMany({ data: newItems })

      const allItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId },
      })

      const subtotal = allItems.reduce((sum, i) => sum + i.costoTotal, 0)
      const igv = oc.moneda !== 'USD' ? subtotal * 0.18 : 0
      const total = subtotal + igv

      await tx.ordenCompra.update({
        where: { id: ordenCompraId },
        data: { subtotal, igv, total, updatedAt: now },
      })
    })

    return NextResponse.json({ success: true, count: newItems.length })
  } catch (error) {
    console.error('Error al agregar items a OC:', error)
    return NextResponse.json({ error: 'Error al agregar items' }, { status: 500 })
  }
}
