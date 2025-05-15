// ===================================================
// 📁 Archivo: lista-equipos-item/route.ts
// 📌 Ubicación: src/app/api/lista-equipos-item/route.ts
// 🔧 Descripción: API para gestionar ítems de lista de equipos
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquiposItemPayload } from '@/types'

export async function GET() {
  try {
    const items = await prisma.listaEquiposItem.findMany({
      include: {
        lista: true,
        proyectoEquipoItem: true,
        cotizaciones: true
      }
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error en GET /lista-equipos-item:', error)
    return NextResponse.json(
      { error: 'Error al obtener los ítems' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: ListaEquiposItemPayload = await request.json()

    // ✅ Validación mínima
    if (!body.listaId || !body.codigo || !body.descripcion || !body.unidad) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const nuevo = await prisma.listaEquiposItem.create({
      data: {
        listaId: body.listaId,
        codigo: body.codigo,
        descripcion: body.descripcion,
        unidad: body.unidad,
        cantidad: body.cantidad || 1,
        precioReferencial: body.precioReferencial ?? 0,
        proyectoEquipoItemId: body.proyectoEquipoItemId || null,
      },
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error en POST /lista-equipos-item:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem' },
      { status: 500 }
    )
  }
}
