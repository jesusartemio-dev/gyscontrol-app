// ===================================================
// 📁 Archivo: /api/proyecto-equipo/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todas las secciones técnicas (ProyectoEquipo)
//    asociadas a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const secciones = await prisma.proyectoEquipoCotizado.findMany({
      where: { proyectoId: id },
      include: {
        user: true,
        proyectoEquipoCotizadoItem: {
          include: {
            catalogoEquipo: true,
            listaEquipo: true,
            listaEquipoSeleccionado: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    // Aggregate costoElegido from ListaEquipoItem grouped by proyectoEquipoId
    const costoListasAgg = await prisma.listaEquipoItem.groupBy({
      by: ['proyectoEquipoId'],
      where: {
        proyectoEquipoId: { in: secciones.map(s => s.id) },
      },
      _sum: { costoElegido: true },
    })

    const costoListasMap = new Map(
      costoListasAgg.map(r => [r.proyectoEquipoId, r._sum.costoElegido || 0])
    )

    // Map relation names for frontend compatibility
    const seccionesFormatted = secciones.map((seccion: any) => ({
      ...seccion,
      responsable: seccion.user,
      items: seccion.proyectoEquipoCotizadoItem,
      costoListas: costoListasMap.get(seccion.id) || 0,
    }))
    return NextResponse.json(seccionesFormatted)
  } catch (error) {
    console.error('❌ Error al obtener secciones del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener secciones' }, { status: 500 })
  }
}

