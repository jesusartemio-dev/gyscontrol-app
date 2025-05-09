// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/plantilla-servicio/[id]
// 🔧 Descripción: CRUD específico para PlantillaServicio por ID
// 🧠 Uso: Actualizar o eliminar una sección específica de servicios
// ✍️ Autor: Jesús Artemio
// 🗓️ Actualizado: 2025-05-01 (corrige warning de Next.js)
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ Previene errores de caché en rutas dinámicas

// ✅ Actualizar sección de servicios
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    const actualizado = await prisma.plantillaServicio.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar grupo de servicio:', error)
    return NextResponse.json(
      { error: 'Error al actualizar grupo de servicio' },
      { status: 500 }
    )
  }
}

// ✅ Eliminar sección de servicios + todos sus ítems relacionados
export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    await prisma.plantillaServicioItem.deleteMany({
      where: { plantillaServicioId: id }
    })

    await prisma.plantillaServicio.delete({
      where: { id }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Error al eliminar grupo de servicio:', error)
    return NextResponse.json(
      { error: 'Error al eliminar grupo de servicio' },
      { status: 500 }
    )
  }
}
