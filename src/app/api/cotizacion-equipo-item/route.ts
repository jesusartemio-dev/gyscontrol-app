// src/app/api/cotizacion-equipo-item/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CotizacionEquipoItemPayload } from '@/types'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const data: CotizacionEquipoItemPayload = await req.json()
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const requiredFields: (keyof CotizacionEquipoItemPayload)[] = [
      'cotizacionEquipoId',
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

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return NextResponse.json(
          { error: `Campo faltante o inválido: ${field}` },
          { status: 400 }
        )
      }
    }

    // ✅ Crear el ítem
    const nuevo = await prisma.cotizacionEquipoItem.create({
      data: {
        id: randomUUID(),
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        categoria: true,
        unidad: true,
        marca: true,
        precioLista: true,
        precioInterno: true,
        factorCosto: true,
        factorVenta: true,
        precioCliente: true,
        cantidad: true,
        costoInterno: true,
        costoCliente: true,
        createdAt: true,
        updatedAt: true,
        cotizacionEquipoId: true,
        catalogoEquipoId: true
      }
    })

    // ✅ Obtener cotizacionId
    const equipo = await prisma.cotizacionEquipo.findUnique({
      where: { id: nuevo.cotizacionEquipoId },
      select: { cotizacionId: true }
    })

    if (equipo) {
      await recalcularTotalesCotizacion(equipo.cotizacionId)
    }

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear ítem de cotización equipo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: errorMessage,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : null
    }, { status: 500 })
  }
}
