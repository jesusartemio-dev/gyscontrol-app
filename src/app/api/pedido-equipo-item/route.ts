// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo-item/
// 🔧 Descripción: API para crear y listar ítems de pedidos de equipo
//
// 🧠 Uso: Se usa para registrar los ítems asociados a cada pedido
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoItemPayload } from '@/types'

// ✅ Listar todos los ítems (puede filtrarse por pedidoId más adelante)
export async function GET() {
  try {
    const data = await prisma.pedidoEquipoItem.findMany({
      include: {
        pedido: true,
        listaEquipoItem: true,
      },
      orderBy: { fechaNecesaria: 'asc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener ítems de pedidos: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Crear nuevo ítem
export async function POST(request: Request) {
  try {
    const body: PedidoEquipoItemPayload = await request.json()

    const data = await prisma.pedidoEquipoItem.create({
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
