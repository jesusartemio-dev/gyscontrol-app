import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const proveedor = await prisma.proveedor.findUnique({ where: { id } })
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    // Verificar referencias que bloquean la eliminación
    const [cotizaciones, listaItems, ordenes, cuentas, pedidos] = await Promise.all([
      prisma.cotizacionProveedor.count({ where: { proveedorId: id } }),
      prisma.listaEquipoItem.count({ where: { proveedorId: id } }),
      prisma.ordenCompra.count({ where: { proveedorId: id } }),
      prisma.cuentaPorPagar.count({ where: { proveedorId: id } }),
      prisma.pedidoEquipoItem.count({ where: { proveedorId: id } }),
    ])

    const bloqueantes: string[] = []
    if (cotizaciones > 0) bloqueantes.push(`${cotizaciones} cotización${cotizaciones > 1 ? 'es' : ''}`)
    if (listaItems > 0) bloqueantes.push(`${listaItems} ítem${listaItems > 1 ? 's' : ''} en listas de equipo`)
    if (ordenes > 0) bloqueantes.push(`${ordenes} orden${ordenes > 1 ? 'es' : ''} de compra`)
    if (cuentas > 0) bloqueantes.push(`${cuentas} cuenta${cuentas > 1 ? 's' : ''} por pagar`)
    if (pedidos > 0) bloqueantes.push(`${pedidos} ítem${pedidos > 1 ? 's' : ''} en pedidos de equipo`)

    if (bloqueantes.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar este proveedor porque está siendo usado en:',
          bloqueantes,
        },
        { status: 409 }
      )
    }

    await prisma.proveedor.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar proveedor:', error)
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
  }
}
