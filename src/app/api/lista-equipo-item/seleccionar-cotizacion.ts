import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { listaEquipoItemId, cotizacionProveedorItemId } = await request.json()

    // 🔍 Buscar la cotización con la relación cotizacionProveedor.proveedorId
    const cotizacion = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: cotizacionProveedorItemId },
      include: {
        cotizacionProveedor: {
          select: {
            proveedorId: true,
          },
        },
      },
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const costoElegido =
      (cotizacion.precioUnitario ?? 0) *
      (cotizacion.cantidad ?? cotizacion.cantidadOriginal)

    const actualizado = await prisma.listaEquipoItem.update({
      where: { id: listaEquipoItemId },
      data: {
        cotizacionSeleccionadaId: cotizacion.id,
        precioElegido: cotizacion.precioUnitario ?? undefined,
        costoElegido,
        proveedorId: cotizacion.cotizacionProveedor.proveedorId,
      },
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al seleccionar cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
