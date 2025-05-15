// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar y eliminar una cotización de proveedor específica
//
// 🧠 Uso: Manejo individual de cotizaciones de proveedores desde formularios o listas
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CotizacionProveedorUpdatePayload } from '@/types'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.cotizacionProveedor.findUnique({
        where: { id },
        include: {
            proyecto: true,
            items: {
            include: {
                listaItem: true,
            },
            },
        },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la cotización' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const payload: CotizacionProveedorUpdatePayload = await request.json()

    const actualizada = await prisma.cotizacionProveedor.update({
      where: { id },
      data: {
        nombre: payload.nombre,
        ruc: payload.ruc,
        contacto: payload.contacto,
        estado: payload.estado
      }
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    await prisma.cotizacionProveedor.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 })
  }
}
