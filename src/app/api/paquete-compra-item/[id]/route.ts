// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/paquete-compra-item/[id]/route.ts
// 🔧 Descripción: API para ver, actualizar o eliminar un ítem del paquete de compra
//
// 🧠 Uso: Módulo de logística, administración de compras y seguimiento de entrega
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { PaqueteCompraItemUpdatePayload } from '@/types'

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params

    const item = await prisma.paqueteCompraItem.findUnique({
      where: { id },
      include: {
        paquete: { select: { id: true, nombre: true } },
        requerimientoItem: { select: { id: true, codigo: true, descripcion: true } },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('[PAQUETE-COMPRA-ITEM_GET]', error)
    return NextResponse.json({ error: 'Error al obtener el ítem' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const data: PaqueteCompraItemUpdatePayload = await request.json()

    const actualizado = await prisma.paqueteCompraItem.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('[PAQUETE-COMPRA-ITEM_PUT]', error)
    return NextResponse.json({ error: 'Error al actualizar el ítem' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params

    await prisma.paqueteCompraItem.delete({
      where: { id },
    })

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('[PAQUETE-COMPRA-ITEM_DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar el ítem' }, { status: 500 })
  }
}
