// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/paquete-compra-item/route.ts
// 🔧 Descripción: API para crear y listar ítems de paquetes de compra
//
// 🧠 Uso: Módulo de logística para agregar ítems a un paquete de compra
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { PaqueteCompraItemPayload } from '@/types'

export async function GET() {
  try {
    const items = await prisma.paqueteCompraItem.findMany({
      include: {
        paquete: { select: { id: true, nombre: true } },
        requerimientoItem: { select: { id: true, codigo: true, descripcion: true } },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[PAQUETE-COMPRA-ITEM_GET]', error)
    return NextResponse.json({ error: 'Error al obtener los ítems del paquete' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data: PaqueteCompraItemPayload = await request.json()

    const creado = await prisma.paqueteCompraItem.create({
      data,
    })

    return NextResponse.json(creado)
  } catch (error) {
    console.error('[PAQUETE-COMPRA-ITEM_POST]', error)
    return NextResponse.json({ error: 'Error al crear ítem del paquete' }, { status: 500 })
  }
}
