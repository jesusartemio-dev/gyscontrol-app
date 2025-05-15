// ===================================================
// 📁 Archivo: from-proyecto/[id]/route.ts
// 📌 Descripción: Crea una lista técnica basada en los ProyectoEquipoItem
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-11
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, context: { params: { id: string } }) {
  const { id: proyectoId } = await context.params

  try {
    // 1. Obtener todos los ProyectoEquipoItem del proyecto
    const items = await prisma.proyectoEquipoItem.findMany({
      where: { proyectoEquipo: { proyectoId } },
      include: {
        proyectoEquipo: true,
      },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No hay equipos técnicos registrados en el proyecto' },
        { status: 400 }
      )
    }

    // 2. Crear nueva ListaEquipos
    const nuevaLista = await prisma.listaEquipos.create({
      data: {
        proyectoId,
        nombre: 'Lista desde Cotización',
        descripcion: 'Generada automáticamente desde los equipos técnicos',
      },
    })

    // 3. Crear ítems para la lista
    const nuevosItems = items.map((item) => {
      return prisma.listaEquiposItem.create({
        data: {
          listaId: nuevaLista.id,
          proyectoEquipoItemId: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioReferencial: item.precioCliente,
        },
      })
    })

    await prisma.$transaction(nuevosItems)

    return NextResponse.json(nuevaLista)
  } catch (error) {
    console.error('❌ Error al generar lista desde equipos:', error)
    return NextResponse.json(
      { error: 'Error interno al generar la lista desde equipos técnicos' },
      { status: 500 }
    )
  }
}
