// ===================================================
// 📁 Archivo: /api/proyecto-equipo/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todas las secciones técnicas (ProyectoEquipo)
//    asociadas a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const secciones = await prisma.proyectoEquipo.findMany({
      where: { proyectoId: id },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })
    return NextResponse.json(secciones)
  } catch (error) {
    console.error('❌ Error al obtener secciones del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener secciones' }, { status: 500 })
  }
}

