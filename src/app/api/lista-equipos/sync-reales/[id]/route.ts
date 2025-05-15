// ===================================================
// 📁 Archivo: sync-reales/[id]/route.ts
// 📌 Descripción: Sincroniza cantidadReal, precioReal y costoReal en ProyectoEquipoItem
//    basándose en los ítems de ListaEquiposItem asociados.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-10
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, context: { params: { id: string } }) {
  const { id: proyectoId } = await context.params

  try {
    // 1. Traer todas las listas técnicas del proyecto con sus ítems vinculados
    const listas = await prisma.listaEquipos.findMany({
      where: { proyectoId },
      include: {
        items: {
          where: { proyectoEquipoItemId: { not: null } },
        },
      },
    })

    // 2. Preparar actualizaciones para cada ProyectoEquipoItem relacionado
    const actualizaciones = listas.flatMap(lista =>
      lista.items
        .filter(item => item.proyectoEquipoItemId)
        .map(item =>
          prisma.proyectoEquipoItem.update({
            where: { id: item.proyectoEquipoItemId! },
            data: {
              cantidadReal: item.cantidad,
              precioReal: item.precioReferencial ?? 0,
              costoReal: (item.precioReferencial ?? 0) * item.cantidad,
              estado: 'en_lista', // Opcionalmente actualiza el estado
            },
          })
        )
    )

    // 3. Ejecutar todas las actualizaciones en una transacción
    await prisma.$transaction(actualizaciones)

    return NextResponse.json({
      status: 'ok',
      mensaje: `Se sincronizaron ${actualizaciones.length} ítems correctamente.`,
    })
  } catch (error) {
    console.error('❌ Error al sincronizar ítems reales del proyecto:', error)
    return NextResponse.json(
      { error: 'Error interno al sincronizar datos reales' },
      { status: 500 }
    )
  }
}
