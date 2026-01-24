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

    const items = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        proyectoEquipoCotizado: {
          proyectoId: id,
        },
        ...(soloDisponibles && {
          listaId: null,
        }),
      },
      include: {
        proyectoEquipoCotizado: {
          select: {
            id: true,
            nombre: true,
          },
        },
        catalogoEquipo: true,
        listaEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        listaEquipoItemsAsociados: {
          select: {
            id: true,
            cantidad: true,
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

    // Map for frontend compatibility
    const itemsFormatted = items.map((item: any) => ({
      ...item,
      proyectoEquipo: item.proyectoEquipoCotizado,
      lista: item.listaEquipo,
      listaEquipos: item.listaEquipoItemsAsociados
    }))

    return NextResponse.json(itemsFormatted)
  } catch (error) {
    console.error('❌ Error al obtener items por proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener items' }, { status: 500 })
  }
}
