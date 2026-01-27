// src/app/api/plantilla-equipo/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla' // ✅ Import agregado

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // ✅ Validación de campos requeridos
    if (!data.plantillaId || !data.nombre) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (plantillaId, nombre)' },
        { status: 400 }
      )
    }

    // ✅ Crear el nuevo equipo
    const nuevo = await prisma.plantillaEquipo.create({
      data: {
        id: `plantilla-equipo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        plantillaId: data.plantillaId,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        subtotalInterno: 0,
        subtotalCliente: 0,
        updatedAt: new Date()
      },
    })

    // ✅ Recalcular totales generales de la plantilla
    await recalcularTotalesPlantilla(data.plantillaId)

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /api/plantilla-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno al crear plantillaEquipo' },
      { status: 500 }
    )
  }
}
