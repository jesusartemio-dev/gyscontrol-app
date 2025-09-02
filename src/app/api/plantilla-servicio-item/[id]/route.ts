// ===================================================
// 📁 Archivo: /api/plantilla-servicio-item/[id]/route.ts
// ✅ Versión corregida con uso de dynamic params
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PlantillaServicioItemUpdatePayload } from '@/types'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ Previene errores de caché y SSR en rutas dinámicas

// ✅ Actualizar ítem de servicio
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data: PlantillaServicioItemUpdatePayload = await req.json()

    const actualizado = await prisma.plantillaServicioItem.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar ítem de servicio:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem' }, { status: 500 })
  }
}

// ✅ Eliminar ítem con logs y control de errores
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const existe = await prisma.plantillaServicioItem.findUnique({ where: { id } })
    if (!existe) {
      console.warn('⚠️ Ítem no encontrado:', id)
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    await prisma.plantillaServicioItem.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error al eliminar ítem de servicio:', error)
    return NextResponse.json(
      { error: 'Error al eliminar ítem', detalle: error.message },
      { status: 500 }
    )
  }
}
