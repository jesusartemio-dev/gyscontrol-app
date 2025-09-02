// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener ProyectoEquipoItems de un proyecto, opcionalmente solo los disponibles
// ✅ Incluye listaEquipos con cantidad para calcular faltantes
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const soloDisponibles = req.nextUrl.searchParams.get('soloDisponibles') === 'true'

    const items = await prisma.proyectoEquipoItem.findMany({
      where: {
        proyectoEquipo: {
          proyectoId: id,
        },
        ...(soloDisponibles && {
          listaId: null,
        }),
      },
      include: {
        proyectoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        catalogoEquipo: true,
        lista: {
          select: {
            id: true,
            nombre: true,
          },
        },
        listaEquipos: {
          select: {
            id: true,
            cantidad: true, // ✅ Trae cantidad para saber cuánto ya se listó
          },
        },
        listaEquipoSeleccionado: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error al obtener items por proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener items' }, { status: 500 })
  }
}
