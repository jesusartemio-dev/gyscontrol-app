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

    const seccionIds = secciones.map(s => s.id)

    // Aggregate costoElegido from ListaEquipoItem grouped by proyectoEquipoId
    const costoListasAgg = await prisma.listaEquipoItem.groupBy({
      by: ['proyectoEquipoId'],
      where: {
        proyectoEquipoId: { in: seccionIds },
      },
      _sum: { costoElegido: true },
    })

    const costoListasMap = new Map(
      costoListasAgg.map(r => [r.proyectoEquipoId, r._sum.costoElegido || 0])
    )

    // Get unique listas per equipo group (via ListaEquipoItem -> ListaEquipo)
    const listaItems = await prisma.listaEquipoItem.findMany({
      where: { proyectoEquipoId: { in: seccionIds } },
      select: {
        proyectoEquipoId: true,
        listaEquipo: { select: { id: true, codigo: true, nombre: true } },
      },
    })

    // Build map: proyectoEquipoId -> unique listas
    const listasMap = new Map<string, { id: string; codigo: string; nombre: string }[]>()
    for (const item of listaItems) {
      if (!item.proyectoEquipoId) continue
      const lista = item.listaEquipo
      if (!listasMap.has(item.proyectoEquipoId)) {
        listasMap.set(item.proyectoEquipoId, [])
      }
      const arr = listasMap.get(item.proyectoEquipoId)!
      if (!arr.some(l => l.id === lista.id)) {
        arr.push({ id: lista.id, codigo: lista.codigo, nombre: lista.nombre })
      }
    }

    // Map relation names for frontend compatibility
    const seccionesFormatted = secciones.map((seccion: any) => ({
      ...seccion,
      responsable: seccion.user,
      items: seccion.proyectoEquipoCotizadoItem,
      costoListas: costoListasMap.get(seccion.id) || 0,
      listas: listasMap.get(seccion.id) || [],
    }))
    return NextResponse.json(seccionesFormatted)
  } catch (error) {
    console.error('❌ Error al obtener secciones del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener secciones' }, { status: 500 })
  }
}

