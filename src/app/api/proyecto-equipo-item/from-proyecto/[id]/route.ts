// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los ProyectoEquipoItem de un proyecto con nombre de lista técnica
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // 🛡️ Evita caché de rutas

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const items = await prisma.proyectoEquipoItem.findMany({
      where: {
        proyectoEquipo: {
          proyectoId: id,
        },
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
            nombre: true, // ✅ Solo los campos necesarios
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
