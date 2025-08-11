import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorUpdatePayload } from '@/types'

// GET → Obtener cotización por ID
export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params // ✅ quitamos 'await'

    const data = await prisma.cotizacionProveedor.findUnique({
      where: { id },
      include: {
        proveedor: true,
        proyecto: true,
        items: {
          include: {
            lista: true,
            listaEquipoItem: true,
          },
          orderBy: {
            codigo: 'asc', // ✅ Ordena por código ascendente
          },
        },
      },
    })

    if (!data) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener la cotización:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// PUT → Actualizar cotización por ID
export async function PUT(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params // ✅ quitamos 'await'
    const body: CotizacionProveedorUpdatePayload = await req.json()

    const data = await prisma.cotizacionProveedor.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar la cotización:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// DELETE → Eliminar cotización por ID
export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params // ✅ quitamos 'await'

    await prisma.cotizacionProveedorItem.deleteMany({
      where: { cotizacionId: id },
    })

    await prisma.cotizacionProveedor.delete({
      where: { id },
    })

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('❌ Error al eliminar la cotización:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
