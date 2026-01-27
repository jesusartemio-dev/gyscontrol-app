// src/app/api/cotizacion-equipo/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion' // ✅ Reutiliza tu lógica de recalculo si la tienes

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // ✅ Validación de campos requeridos
    if (!data.cotizacionId || !data.nombre) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (cotizacionId, nombre)' },
        { status: 400 }
      )
    }

    // ✅ Crear el nuevo grupo de equipos
    const nuevo = await prisma.cotizacionEquipo.create({
      data: {
        id: `cot-equipo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cotizacionId: data.cotizacionId,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        subtotalInterno: 0,
        subtotalCliente: 0,
        updatedAt: new Date()
      },
    })

    // ✅ Recalcular totales generales de la cotización
    await recalcularTotalesCotizacion(data.cotizacionId)

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /api/cotizacion-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno al crear cotizacionEquipo' },
      { status: 500 }
    )
  }
}
