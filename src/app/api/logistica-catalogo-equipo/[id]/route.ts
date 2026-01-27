// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/logistica-catalogo-equipo/[id]/
// 🔧 Descripción: PUT y DELETE para equipos desde logística
// 🧠 Uso: Permite actualizar solo campos visibles para logística
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-28
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const {id} = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const data = await req.json()

    // 🔎 Solo campos que logística puede editar
    const allowedFields = ['codigo', 'descripcion', 'marca', 'precioInterno', 'categoriaId', 'unidadId', 'estado']

    const payload: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in data) {
        payload[field] = data[field]
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron campos válidos para actualizar' }, { status: 400 })
    }

    const actualizado = await prisma.catalogoEquipo.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        precioInterno: true,
        estado: true,
        categoriaEquipo: { select: { id: true, nombre: true } },
        unidad: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar equipo (logística):', error)
    return NextResponse.json({ error: 'Error interno al actualizar equipo' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const {id} = await  context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const eliminado = await prisma.catalogoEquipo.delete({
      where: { id },
      select: {
        id: true,
        codigo: true,
      },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    console.error('❌ Error al eliminar equipo (logística):', error)
    return NextResponse.json({ error: 'Error interno al eliminar equipo' }, { status: 500 })
  }
}
