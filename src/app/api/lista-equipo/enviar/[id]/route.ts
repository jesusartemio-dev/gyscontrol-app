// ===================================================
// 📁 Archivo: /api/lista-equipo/enviar/[id]/route.ts
// 📌 Descripción: Envía una lista técnica a revisión
//
// 🧠 Uso: Cambia el estado de la lista y de los ProyectoEquipoItem relacionados
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(_: Request, context: { params: { id: string } }) {
  const { id: listaId } = await context.params

  try {
    // 1. Obtener ítems de la lista con vínculo a ProyectoEquipoItem
    const items = await prisma.listaEquipoItem.findMany({
      where: { listaId },
      select: { proyectoEquipoItemId: true },
    })

    // 2. Generar actualizaciones en los ProyectoEquipoItem (estado: en_lista)
    const actualizaciones = items
      .filter((item) => item.proyectoEquipoItemId)
      .map((item) =>
        prisma.proyectoEquipoItem.update({
          where: { id: item.proyectoEquipoItemId! },
          data: { estado: 'en_lista' },
        })
      )

    // 3. Ejecutar en una transacción: actualizaciones + cambio de estado de la lista
    await prisma.$transaction([
      ...actualizaciones,
      prisma.listaEquipo.update({
        where: { id: listaId },
        data: { estado: 'por_revisar' },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al enviar lista: ' + String(error) },
      { status: 500 }
    )
  }
}
