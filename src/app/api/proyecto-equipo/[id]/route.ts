// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/proyecto-equipo/[id]/route.ts
// 🔧 Descripción: API para GET, PUT y DELETE de grupos de equipos del proyecto
//
// 🧠 Uso: Utilizado por getProyectoEquipoById(equipoId)
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ Para evitar problemas de caché en rutas dinámicas

// ✅ Obtener un grupo de equipo por ID
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const equipo = await prisma.proyectoEquipoCotizado.findUnique({
      where: { id },
      include: {
        responsable: true,
        items: {
          include: {
            catalogoEquipo: true,
            lista: true,
            listaEquipoSeleccionado: true,
            listaEquipos: true
          }
        }
      }
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(equipo)
  } catch (error) {
    console.error('Error en GET /api/proyecto-equipo/[id]', error)
    return NextResponse.json({ error: 'Error al obtener equipo del proyecto' }, { status: 500 })
  }
}
