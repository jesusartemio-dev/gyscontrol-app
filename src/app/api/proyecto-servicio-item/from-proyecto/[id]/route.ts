// ===================================================
// 📁 Archivo: /api/proyecto-servicio-item/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los ítems de servicios (ProyectoServicioCotizadoItem)
//    asociados a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const items = await prisma.proyectoServicioCotizadoItem.findMany({
      where: { proyectoServicio: { proyectoId: id } },
      include: {
        proyectoServicio: {
          include: {
            responsable: true,
          },
        },
        catalogoServicio: {
          include: {
            categoria: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error al obtener ítems de servicios del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener ítems de servicios' }, { status: 500 })
  }
}