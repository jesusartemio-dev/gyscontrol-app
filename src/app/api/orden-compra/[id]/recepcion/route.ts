import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar recepción' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (!['confirmada', 'parcial'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede registrar recepción en estado confirmada o parcial' }, { status: 400 })
    }

    const body = await req.json()
    const recepciones: { itemId: string; cantidadRecibida: number }[] = body.items

    if (!recepciones || recepciones.length === 0) {
      return NextResponse.json({ error: 'Debe indicar al menos un item' }, { status: 400 })
    }

    // Update each item's cantidadRecibida
    for (const rec of recepciones) {
      const item = existing.items.find(i => i.id === rec.itemId)
      if (!item) continue
      const nueva = Math.min(rec.cantidadRecibida, item.cantidad)
      await prisma.ordenCompraItem.update({
        where: { id: rec.itemId },
        data: { cantidadRecibida: nueva, updatedAt: new Date() },
      })
    }

    // Re-fetch items to compute state
    const updatedItems = await prisma.ordenCompraItem.findMany({
      where: { ordenCompraId: id },
    })

    const todosCompletos = updatedItems.every(i => i.cantidadRecibida >= i.cantidad)
    const algunoRecibido = updatedItems.some(i => i.cantidadRecibida > 0)

    let nuevoEstado = existing.estado
    if (todosCompletos) {
      nuevoEstado = 'completada'
    } else if (algunoRecibido) {
      nuevoEstado = 'parcial'
    }

    const data = await prisma.ordenCompra.update({
      where: { id },
      data: { estado: nuevoEstado, updatedAt: new Date() },
      include: {
        proveedor: true,
        centroCosto: { select: { id: true, nombre: true, tipo: true, proyectoId: true } },
        pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        solicitante: { select: { id: true, name: true, email: true } },
        aprobador: { select: { id: true, name: true, email: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al registrar recepción:', error)
    return NextResponse.json({ error: 'Error al registrar recepción' }, { status: 500 })
  }
}
