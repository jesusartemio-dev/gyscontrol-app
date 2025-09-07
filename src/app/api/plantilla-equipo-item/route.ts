// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla-equipo-item
// 🔧 Descripción: Crear ítems de equipo para plantilla con validación y recálculo
// ✍️ Autor: Asistente IA GYS
// 🗓️ Última actualización: 2025-04-24
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { PlantillaEquipoItemPayload } from '@/types'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'

export async function POST(req: NextRequest) {
  try {
    const data: PlantillaEquipoItemPayload = await req.json()
    
    // 🔍 Debug: Log de los datos recibidos
    console.log('📥 Datos recibidos en API:', JSON.stringify(data, null, 2))

    if (!data || typeof data !== 'object') {
      console.log('❌ Datos inválidos o no es objeto')
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const requiredFields: (keyof PlantillaEquipoItemPayload)[] = [
      'plantillaEquipoId',
      'codigo',
      'descripcion',
      'categoria',
      'unidad',
      'marca',
      'precioInterno',
      'precioCliente',
      'cantidad',
      'costoInterno',
      'costoCliente'
    ]

    // 🔍 Debug: Verificar cada campo
    const missingFields: string[] = []
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        missingFields.push(field)
      }
    }
    
    if (missingFields.length > 0) {
      console.log('❌ Campos faltantes:', missingFields)
      console.log('📊 Campos presentes:', Object.keys(data))
      return NextResponse.json(
        { 
          error: `Campos faltantes o inválidos: ${missingFields.join(', ')}`,
          received: Object.keys(data),
          missing: missingFields
        },
        { status: 400 }
      )
    }

    const nuevo = await prisma.plantillaEquipoItem.create({
      data,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        categoria: true,
        unidad: true,
        marca: true,
        precioInterno: true,
        precioCliente: true,
        cantidad: true,
        costoInterno: true,
        costoCliente: true,
        createdAt: true,
        updatedAt: true,
        plantillaEquipoId: true
      }
    })

    const equipo = await prisma.plantillaEquipo.findUnique({
      where: { id: nuevo.plantillaEquipoId },
      select: { plantillaId: true }
    })

    if (equipo) {
      await recalcularTotalesPlantilla(equipo.plantillaId)
    }

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear ítem de equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
