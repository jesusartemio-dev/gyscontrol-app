// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/catalogo-equipo/[id]/
// 🔧 Descripción: Manejo de actualización y eliminación de equipos del catálogo.
// 🧠 Uso: PUT y DELETE sobre equipos existentes.
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-25
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const data = await req.json()

    // 🔎 Validación mínima de campos importantes (actualización parcial permitida)
    const allowedFields = [
      'nombre', 'descripcion', 'categoriaEquipoId', 'unidadId', 'precio',
      'codigo', 'marca', 'precioInterno', 'margen', 'precioVenta', 'categoriaId', 'estado'
    ]

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
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar equipo:', error)
    return NextResponse.json({ error: 'Error interno al actualizar equipo' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const eliminado = await prisma.catalogoEquipo.delete({
      where: { id },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    console.error('❌ Error al eliminar equipo:', error)
    return NextResponse.json({ error: 'Error interno al eliminar equipo' }, { status: 500 })
  }
}
