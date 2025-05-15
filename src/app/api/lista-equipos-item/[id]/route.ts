// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipos-item/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar un ListaEquiposItem
//
// 🧠 Uso: Manejo de un ítem de lista de equipos individual
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquiposItemUpdatePayload } from '@/types'

export async function GET(
  _: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const item = await prisma.listaEquiposItem.findUnique({
      where: { id },
      include: {
        lista: true,
        proyectoEquipoItem: true,
        cotizaciones: true,
      },
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el ítem' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const payload: ListaEquiposItemUpdatePayload = await request.json()
    const actualizado = await prisma.listaEquiposItem.update({
      where: { id },
      data: payload,
    })
    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el ítem' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params

    console.log('🗑️ Eliminando ListaEquiposItem con ID:', id)

    const item = await prisma.listaEquiposItem.findUnique({
      where: { id },
      include: { proyectoEquipoItem: true },
    })

    if (!item) {
      console.error('❌ Item no encontrado')
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
      console.log('🔁 ProyectoEquipoItem desvinculado')
    }

    const eliminado = await prisma.listaEquiposItem.delete({
      where: { id },
    })

    console.log('✅ Ítem eliminado:', eliminado.id)
    return NextResponse.json(eliminado)
  } catch (error) {
    console.error('❌ Error al eliminar ítem:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el ítem' },
      { status: 500 }
    )
  }
}
