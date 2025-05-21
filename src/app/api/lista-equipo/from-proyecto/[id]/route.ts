// ===================================================
// 📁 Archivo: from-proyecto/[id]/route.ts
// 📌 Descripción: Crea una lista técnica basada en los ProyectoEquipoItem
// 🧠 Uso: POST → Genera ListaEquipo + ítems desde los equipos técnicos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
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

    // 2. Crear nueva ListaEquipo + ítems dentro de una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaLista = await tx.listaEquipo.create({
        data: {
          proyectoId,
          nombre: 'Lista desde Cotización',
          descripcion: 'Generada automáticamente desde los equipos técnicos',
        },
      })

      const nuevosItems = items.map((item) =>
        tx.listaEquipoItem.create({
          data: {
            listaId: nuevaLista.id,
            proyectoEquipoItemId: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            unidad: item.unidad,
            cantidad: item.cantidad,
            presupuesto: item.precioCliente, // 🟢 precioReferencial → presupuesto
          },
        })
      )

      await Promise.all(nuevosItems)


      return nuevaLista
    })

    return NextResponse.json(resultado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno al generar la lista desde equipos técnicos: ' + String(error) },
      { status: 500 }
    )
  }
}
