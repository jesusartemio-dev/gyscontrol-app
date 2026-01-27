// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/disponibles/[proyectoId]/route.ts
// 📌 Descripción: Retorna los ProyectoEquipoItem que NO están asociados a ListaEquipoItem
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ proyectoId: string }> }) {
  const { proyectoId } = await context.params

  try {
      const items = await prisma.proyectoEquipoCotizadoItem.findMany({
        where: {
          proyectoEquipoCotizado: {
            proyectoId: proyectoId,
          },
          listaEquipoItemsAsociados: {
            none: {}, // ❌ No debe estar referenciado en ninguna lista
          },
        },
        include: {
          proyectoEquipoCotizado: true,
          catalogoEquipo: true,
          listaEquipoSeleccionado: {
            select: {
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
    console.error('❌ Error en GET /disponibles/[proyectoId]:', error)
    return NextResponse.json(
      { error: 'Error al obtener equipos disponibles' },
      { status: 500 }
    )
  }
}
