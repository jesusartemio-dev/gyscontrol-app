// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/cotizacion-servicio-item/[id]
// 🔧 Descripción: Actualiza o elimina un ítem de servicio de una cotización
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-01
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import type { CotizacionServicioItemUpdatePayload } from '@/types'

// ✅ Actualizar ítem de servicio en cotización
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ Corrección para evitar error de Next.js

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const data: CotizacionServicioItemUpdatePayload = await req.json()

    const actualizado = await prisma.cotizacionServicioItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        cotizacionServicioId: true,
        catalogoServicioId: true,
        unidadServicioId: true,
        recursoId: true,
        nombre: true,
        descripcion: true,
        edtId: true,
        formula: true,
        horaBase: true,
        horaRepetido: true,
        horaUnidad: true,
        horaFijo: true,
        unidadServicioNombre: true,
        recursoNombre: true,
        costoHora: true,
        cantidad: true,
        horaTotal: true,
        factorSeguridad: true,
        margen: true,
        costoInterno: true,
        costoCliente: true,
        nivelDificultad: true,
        orden: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const servicio = await prisma.cotizacionServicio.findUnique({
      where: { id: actualizado.cotizacionServicioId },
      select: { cotizacionId: true }
    })

    if (servicio?.cotizacionId) {
      await recalcularTotalesCotizacion(servicio.cotizacionId)
    }

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar ítem de servicio de cotización:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem' }, { status: 500 })
  }
}

// ✅ Eliminar ítem de servicio de cotización
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ Corrección

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const item = await prisma.cotizacionServicioItem.findUnique({
      where: { id },
      select: { cotizacionServicioId: true }
    })

    await prisma.cotizacionServicioItem.delete({ where: { id } })

    if (item) {
      const servicio = await prisma.cotizacionServicio.findUnique({
        where: { id: item.cotizacionServicioId },
        select: { cotizacionId: true }
      })

      if (servicio?.cotizacionId) {
        await recalcularTotalesCotizacion(servicio.cotizacionId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Error al eliminar ítem de servicio de cotización:', error)
    return NextResponse.json({ error: 'Error al eliminar ítem' }, { status: 500 })
  }
}
