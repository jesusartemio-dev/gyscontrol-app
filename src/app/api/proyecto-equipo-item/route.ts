// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/route.ts
// 📌 Descripción: Ruta para crear un nuevo ProyectoEquipoItem
// ✍️ Autor: Asistente IA GYS
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const data = await req.json()

    const nuevoItem = await prisma.proyectoEquipoItem.create({
      data,
    })

    return NextResponse.json(nuevoItem)
  } catch (error) {
    console.error('❌ Error al crear ProyectoEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem de equipo del proyecto' },
      { status: 500 }
    )
  }
}
