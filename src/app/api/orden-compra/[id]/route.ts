import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canDelete } from '@/lib/utils/deleteValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

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
  cuentasPorPagar: {
    where: { estado: { not: 'anulada' as const } },
    select: {
      id: true,
      numeroFactura: true,
      monto: true,
      moneda: true,
      saldoPendiente: true,
      estado: true,
      fechaVencimiento: true,
      fechaRecepcion: true,
    },
    orderBy: { createdAt: 'desc' as const },
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
    const role = session.user.role

    // 🛡️ Validar dependientes antes de eliminar (role-aware)
    const deleteCheck = await canDelete('ordenCompra', id, { role })
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Verificar permisos: creador, admin, gerente o logistico
    const existing = await prisma.ordenCompra.findUnique({
      where: { id },
      select: { solicitanteId: true, estado: true, numero: true, proyectoId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    const rolesPermitidos = ['admin', 'gerente', 'logistico']
    if (existing.solicitanteId !== session.user.id && !rolesPermitidos.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para eliminar esta orden' }, { status: 403 })
    }

    // OCs no-borrador requieren admin y limpieza transaccional
    if (existing.estado !== 'borrador') {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Solo admin puede eliminar OCs fuera de borrador' }, { status: 403 })
      }

      await prisma.$transaction(async (tx) => {
        // 1. Obtener OCI ids de esta OC
        const ociIds = (await tx.ordenCompraItem.findMany({
          where: { ordenCompraId: id },
          select: { id: true },
        })).map(i => i.id)

        if (ociIds.length > 0) {
          // 2. Revertir cantidadRecibida en los OCI (para recalcular estado OC no aplica — se va a eliminar)
          // Pero sí necesitamos limpiar recepciones no-entregadas que serán cascadeadas
          // Las EntregaItems vinculadas se setearán a null por onDelete: SetNull en el schema

          // 3. Eliminar recepciones pendientes (no entregadas — las entregadas ya fueron bloqueadas por canDelete)
          await tx.recepcionPendiente.deleteMany({
            where: {
              ordenCompraItemId: { in: ociIds },
            },
          })
        }

        // 4. Eliminar OCI (cascade from OC delete lo haría, pero lo hacemos explícito para claridad)
        await tx.ordenCompraItem.deleteMany({ where: { ordenCompraId: id } })

        // 5. Eliminar la OC
        await tx.ordenCompra.delete({ where: { id } })
      })

      // Auditoría fire-and-forget
      crearEvento(prisma, {
        tipo: 'oc_eliminada',
        descripcion: `OC ${existing.numero} eliminada por admin (estado: ${existing.estado})`,
        usuarioId: session.user.id,
        proyectoId: existing.proyectoId,
        metadata: {
          ordenCompraId: id,
          ordenCompraNumero: existing.numero,
          estadoAlEliminar: existing.estado,
        },
      }).catch(() => {})

      return NextResponse.json({ success: true })
    }

    // Borrador: eliminación simple (cascade se encarga de los OCI)
    await prisma.ordenCompra.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar orden de compra:', error)
    return NextResponse.json({ error: 'Error al eliminar orden de compra' }, { status: 500 })
  }
}
