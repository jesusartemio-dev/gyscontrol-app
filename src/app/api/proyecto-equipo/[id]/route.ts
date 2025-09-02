// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/proyecto-equipo/[id]/route.ts
// 🔧 Descripción: Retorna los grupos de equipos de un proyecto
//
// 🧠 Uso: Utilizado por getProyectoEquipos(proyectoId)
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const equipos = await prisma.proyectoEquipo.findMany({
      where: { proyectoId: id },
      include: {
        responsable: true,
        items: true
      }
    })

    return NextResponse.json(equipos)
  } catch (error) {
    console.error('Error en GET /api/proyecto-equipo/[id]', error)
    return NextResponse.json({ error: 'Error al obtener equipos del proyecto' }, { status: 500 })
  }
}
