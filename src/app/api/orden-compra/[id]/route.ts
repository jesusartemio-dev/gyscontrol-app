import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const includeRelations = {
  proveedor: true,
  centroCosto: { select: { id: true, nombre: true, tipo: true } },
  pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  solicitante: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  items: {
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await prisma.ordenCompra.findUnique({
      where: { id },
      include: includeRelations,
    })
    if (!data) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener orden de compra:', error)
    return NextResponse.json({ error: 'Error al obtener orden de compra' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({ where: { id }, include: { items: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (existing.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede editar en estado borrador' }, { status: 400 })
    }

    const payload = await req.json()
    const updateData: any = { updatedAt: new Date() }

    if (payload.condicionPago !== undefined) updateData.condicionPago = payload.condicionPago
    if (payload.diasCredito !== undefined) updateData.diasCredito = payload.diasCredito ? Number(payload.diasCredito) : null
    if (payload.moneda !== undefined) updateData.moneda = payload.moneda
    if (payload.lugarEntrega !== undefined) updateData.lugarEntrega = payload.lugarEntrega
    if (payload.contactoEntrega !== undefined) updateData.contactoEntrega = payload.contactoEntrega
    if (payload.observaciones !== undefined) updateData.observaciones = payload.observaciones
    if (payload.fechaEntregaEstimada !== undefined) {
      updateData.fechaEntregaEstimada = payload.fechaEntregaEstimada ? new Date(payload.fechaEntregaEstimada) : null
    }

    // If items are provided, replace all items
    if (payload.items && Array.isArray(payload.items)) {
      // Delete existing items
      await prisma.ordenCompraItem.deleteMany({ where: { ordenCompraId: id } })

      const newItems = payload.items.map((item: any) => ({
        ordenCompraId: id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        costoTotal: item.cantidad * item.precioUnitario,
        pedidoEquipoItemId: item.pedidoEquipoItemId || null,
        listaEquipoItemId: item.listaEquipoItemId || null,
        updatedAt: new Date(),
      }))

      await prisma.ordenCompraItem.createMany({ data: newItems })

      const subtotal = newItems.reduce((sum: number, i: any) => sum + i.costoTotal, 0)
      const moneda = payload.moneda || existing.moneda
      const igv = moneda === 'USD' ? 0 : subtotal * 0.18
      updateData.subtotal = subtotal
      updateData.igv = igv
      updateData.total = subtotal + igv
    }

    const data = await prisma.ordenCompra.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al actualizar orden de compra:', error)
    return NextResponse.json({ error: 'Error al actualizar orden de compra' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (existing.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede eliminar en estado borrador' }, { status: 400 })
    }

    const role = session.user.role
    if (existing.solicitanteId !== session.user.id && role !== 'admin') {
      return NextResponse.json({ error: 'Solo el creador o admin puede eliminar' }, { status: 403 })
    }

    await prisma.ordenCompra.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar orden de compra:', error)
    return NextResponse.json({ error: 'Error al eliminar orden de compra' }, { status: 500 })
  }
}
