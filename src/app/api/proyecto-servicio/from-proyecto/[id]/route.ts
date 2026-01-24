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
        user: true,
        proyectoServicioCotizadoItem: {
          include: {
            catalogoServicio: true,
          },
        },
        registroHoras: {
          include: {
            recurso: true,
            user: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    // Map relation names for frontend compatibility
    const seccionesFormatted = secciones.map((seccion: any) => ({
      ...seccion,
      responsable: seccion.user,
      items: seccion.proyectoServicioCotizadoItem,
      registrosHoras: seccion.registroHoras?.map((rh: any) => ({
        ...rh,
        usuario: rh.user
      })) || []
    }))
    return NextResponse.json(seccionesFormatted)
  } catch (error) {
    console.error('❌ Error al obtener secciones de servicios del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener secciones de servicios' }, { status: 500 })
  }
}