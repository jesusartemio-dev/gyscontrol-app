// ===================================================
// 📁 Archivo: /api/proyecto-servicio/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todas las secciones técnicas (ProyectoServicioCotizado)
//    asociadas a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const secciones = await prisma.proyectoServicioCotizado.findMany({
      where: { proyectoId: id },
      include: {
        responsable: true,
        items: {
          include: {
            catalogoServicio: true,
          },
        },
        registrosHoras: {
          include: {
            recurso: true,
            usuario: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    })
    return NextResponse.json(secciones)
  } catch (error) {
    console.error('❌ Error al obtener secciones de servicios del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener secciones de servicios' }, { status: 500 })
  }
}