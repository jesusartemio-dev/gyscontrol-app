import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorUpdatePayload } from '@/types'

// GET → Obtener cotización por ID
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const rawData = await prisma.cotizacionProveedor.findUnique({
      where: { id },
      include: {
        proveedor: true,
        proyecto: true,
        cotizacionProveedorItem: {
          include: {
            listaEquipo: true,
            listaEquipoItem: {
              include: {
                cotizacionSeleccionada: {
                  include: {
                    cotizacionProveedor: {
                      include: {
                        proveedor: { select: { id: true, nombre: true } },
                      },
                    },
                  },
                },
                cotizacionProveedorItems: {
                  include: {
                    cotizacionProveedor: {
                      include: {
                        proveedor: { select: { id: true, nombre: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            codigo: 'asc',
          },
        },
      },
    })

    if (!rawData) {
      return NextResponse.json(
        { ok: false, error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // 🔄 Frontend compatibility mapping
    const data = {
      ...rawData,
      items: rawData.cotizacionProveedorItem?.map((item: any) => ({
        ...item,
        lista: item.listaEquipo
      }))
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('❌ Error al obtener la cotización:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al obtener la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// PATCH → Actualizar cotización por ID
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body: CotizacionProveedorUpdatePayload = await req.json()

    const data = await prisma.cotizacionProveedor.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('❌ Error al actualizar la cotización:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al actualizar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// DELETE → Eliminar cotización por ID
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    await prisma.$transaction(async (tx) => {
      // Buscar items que se van a eliminar
      const items = await tx.cotizacionProveedorItem.findMany({
        where: { cotizacionId: id },
        select: { id: true },
      })
      const itemIds = items.map(i => i.id)

      // Limpiar referencias en ListaEquipoItem antes de borrar
      if (itemIds.length > 0) {
        await tx.listaEquipoItem.updateMany({
          where: { cotizacionSeleccionadaId: { in: itemIds } },
          data: {
            cotizacionSeleccionadaId: null,
            precioElegido: null,
            costoElegido: null,
            tiempoEntrega: null,
            tiempoEntregaDias: null,
            updatedAt: new Date(),
          },
        })
      }

      await tx.cotizacionProveedorItem.deleteMany({
        where: { cotizacionId: id },
      })

      await tx.cotizacionProveedor.delete({
        where: { id },
      })
    })

    return NextResponse.json({ ok: true, data: { message: 'Cotización eliminada' } })
  } catch (error) {
    console.error('❌ Error al eliminar la cotización:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al eliminar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}