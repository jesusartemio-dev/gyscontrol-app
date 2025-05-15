// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/disponibles/[proyectoId]/route.ts
// 📌 Descripción: Retorna los ProyectoEquipoItem que NO están asociados a ListaEquiposItem
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: { proyectoId: string } }) {
  const { proyectoId } = context.params

  try {
    const items = await prisma.proyectoEquipoItem.findMany({
      where: {
        proyectoEquipo: {
          proyectoId: proyectoId,
        },
        listaEquipos: {
          none: {}, // ❌ No debe estar referenciado en ninguna lista
        },
      },
      include: {
        proyectoEquipo: true,
        catalogoEquipo: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error en GET /disponibles/[proyectoId]:', error)
    return NextResponse.json(
      { error: 'Error al obtener equipos disponibles' },
      { status: 500 }
    )
  }
}
