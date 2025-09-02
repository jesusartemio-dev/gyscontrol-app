// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/cotizacion-servicio/[id]
// 🔧 Descripción: API para actualizar o eliminar secciones de servicios en cotizaciones
//
// 🧠 Uso: PUT y DELETE sobre CotizacionServicio
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-01
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

// ✅ Actualizar grupo de servicios
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ corrección por Next.js

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const data = await req.json()

    const servicio = await prisma.cotizacionServicio.update({
      where: { id },
      data,
    })

    if (servicio.cotizacionId) {
      await recalcularTotalesCotizacion(servicio.cotizacionId)
    }

    return NextResponse.json(servicio)
  } catch (error) {
    console.error('❌ Error al actualizar sección de servicio (cotización):', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar grupo de servicios
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ corrección por Next.js

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const servicio = await prisma.cotizacionServicio.findUnique({
      where: { id },
      select: { cotizacionId: true },
    })

    await prisma.cotizacionServicio.delete({
      where: { id },
    })

    if (servicio?.cotizacionId) {
      await recalcularTotalesCotizacion(servicio.cotizacionId)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar sección de servicio (cotización):', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
