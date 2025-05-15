// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipos/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar y eliminar una ListaEquipos por ID.
//
// 🧠 Uso: Usado por la vista de detalle de lista de equipos
// ✍️ Autor: GYS Team
// 📅 Última actualización: 2025-05-09
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ✅ Obtener ListaEquipos por ID (GET)
export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.listaEquipos.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            cotizaciones: true,
            proyectoEquipoItem: true
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la lista de equipos' }, { status: 500 })
  }
}

// ✅ Actualizar ListaEquipos (PUT)
export async function PUT(context: { params: { id: string }; request: Request }) {
  try {
    const { id } = await context.params
    const body = await context.request.json()
    const data = await prisma.listaEquipos.update({
      where: { id },
      data: body
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar la lista de equipos' }, { status: 500 })
  }
}

// ✅ Eliminar ListaEquipos (DELETE)
export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    await prisma.listaEquipos.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar la lista de equipos' }, { status: 500 })
  }
}
