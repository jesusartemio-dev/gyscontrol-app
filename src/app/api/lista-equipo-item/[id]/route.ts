// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar un ListaEquipoItem
//
// 🧠 Uso: Manejo de un ítem de lista de equipos individual
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoItemUpdatePayload } from '@/types/payloads'

// ✅ Obtener ítem por ID
export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: {
        lista: true,
        proveedor: true,
        cotizaciones: true,
        pedidos: true,
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true,
          },
        },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Actualizar ítem
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params
    const payload: ListaEquipoItemUpdatePayload = await request.json()

    const actualizado = await prisma.listaEquipoItem.update({
      where: { id },
      data: payload,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Eliminar ítem y desvincular de ProyectoEquipoItem
export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: { proyectoEquipoItem: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    if (item.proyectoEquipoItemId) {
      await prisma.proyectoEquipoItem.update({
        where: { id: item.proyectoEquipoItemId },
        data: {
          listaId: null,
          estado: 'pendiente',
        },
      })
    }

    const eliminado = await prisma.listaEquipoItem.delete({
      where: { id },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
