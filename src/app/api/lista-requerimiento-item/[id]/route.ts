// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-requerimiento-item/[id]/route.ts
// 🔧 Descripción: API para operaciones GET, PUT y DELETE por ID
//    de ListaRequerimientoItem
//
// 🧠 Uso: Consumido desde servicios para leer, actualizar o eliminar
//    un item de requerimiento.
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ✅ GET: Obtener por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: {
        lista: true,
        proyectoEquipoItem: true,
        proveedor: true,
        cotizaciones: true,
      },
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener item' }, { status: 500 })
  }
}

// ✅ PUT: Actualizar por ID
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await request.json()
    const item = await prisma.listaEquipoItem.update({
      where: { id },
      data,
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 })
  }
}

// ✅ DELETE: Eliminar por ID
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const deleted = await prisma.listaEquipoItem.delete({ where: { id } })
    return NextResponse.json(deleted)
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar item' }, { status: 500 })
  }
}
