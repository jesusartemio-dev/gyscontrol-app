// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion-servicio/route.ts
// 🔧 Descripción: API para crear secciones de servicios en una cotización
//
// 🧠 Uso: Se llama cuando el usuario agrega un nuevo grupo de servicios a una cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import type { CotizacionServicioPayload } from '@/types' // 👈 usa tipado específico

// ✅ Listar todos los servicios (opcional: filtrar por cotizacionId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cotizacionId = searchParams.get('cotizacionId')

    const servicios = await prisma.cotizacionServicio.findMany({
      where: cotizacionId ? { cotizacionId } : undefined,
      include: {
        items: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error('❌ Error al listar secciones de servicio (cotización):', error)
    return NextResponse.json(
      { error: 'Error al obtener secciones de servicio' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const data: CotizacionServicioPayload = await req.json()

    // ✅ Validación básica de campos obligatorios
    if (!data.cotizacionId || !data.categoria || !data.nombre) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: cotizacionId, categoría y nombre' },
        { status: 400 }
      )
    }

    // ✅ Crear grupo de servicios
    const nuevo = await prisma.cotizacionServicio.create({
      data: {
        cotizacionId: data.cotizacionId,
        nombre: data.nombre,
        categoria: data.categoria,
        subtotalInterno: data.subtotalInterno ?? 0,
        subtotalCliente: data.subtotalCliente ?? 0
      }
    })

    // ✅ Recalcular totales generales
    await recalcularTotalesCotizacion(data.cotizacionId)

    return NextResponse.json(nuevo, { status: 201 })

  } catch (error) {
    console.error('❌ Error al crear sección de servicio (cotización):', error)
    return NextResponse.json(
      { error: 'Error al crear sección de servicio' },
      { status: 500 }
    )
  }
}
