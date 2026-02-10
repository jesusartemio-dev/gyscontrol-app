// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/proyecto-equipo/[id]/route.ts
// 🔧 Descripción: API para GET, PUT y DELETE de grupos de equipos del proyecto
//
// 🧠 Uso: Utilizado por getProyectoEquipoById(equipoId)
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic' // ✅ Para evitar problemas de caché en rutas dinámicas

// ✅ Obtener un grupo de equipo por ID
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const equipo = await prisma.proyectoEquipoCotizado.findUnique({
      where: { id },
      include: {
        user: true,
        proyectoEquipoCotizadoItem: {
          include: {
            catalogoEquipo: true,
            listaEquipo: true,
            listaEquipoSeleccionado: {
              include: {
                listaEquipo: { select: { id: true, codigo: true, nombre: true } }
              }
            }
          }
        }
      }
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    // Map relation names for frontend compatibility
    const equipoFormatted = {
      ...equipo,
      responsable: equipo.user,
      items: equipo.proyectoEquipoCotizadoItem
    }

    return NextResponse.json(equipoFormatted)
  } catch (error) {
    console.error('Error en GET /api/proyecto-equipo/[id]', error)
    return NextResponse.json({ error: 'Error al obtener equipo del proyecto' }, { status: 500 })
  }
}
