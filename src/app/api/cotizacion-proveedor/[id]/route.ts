// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor/[id]
// 🔧 Descripción: API para ver, actualizar y eliminar una cotización de proveedor por ID
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorUpdatePayload } from '@/types'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.cotizacionProveedor.findUnique({
      where: { id },
      include: {
        proveedor: true,
        proyecto: true,
        items: {
          include: {
            listaEquipoItem: true,
          },
        },
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(context: { params: { id: string }; request: Request }) {
  try {
    const { id } = await context.params
    const body: CotizacionProveedorUpdatePayload = await context.request.json()

    const data = await prisma.cotizacionProveedor.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    await prisma.cotizacionProveedor.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar la cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
