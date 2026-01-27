// ===================================================
// 📁 Archivo: sync-reales/[id]/route.ts
// 📌 Descripción: Sincroniza cantidadReal, precioReal y costoReal en ProyectoEquipoItem
//    basándose en los ítems de ListaEquipoItem asociados.
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await context.params

  try {
    // 1. Obtener todas las listas técnicas del proyecto, con ítems asociados a ProyectoEquipoItem
    const listas = await prisma.listaEquipo.findMany({
      where: { proyectoId },
      include: {
        listaEquipoItem: {
          where: { proyectoEquipoItemId: { not: null } },
        },
      },
    })

    // 2. Crear actualizaciones de ProyectoEquipoItem con los datos reales desde la lista
    const actualizaciones = listas.flatMap(lista =>
      lista.listaEquipoItem
        .filter(item => item.proyectoEquipoItemId)
        .map(item =>
          prisma.proyectoEquipoCotizadoItem.update({
            where: { id: item.proyectoEquipoItemId! },
            data: {
              cantidadReal: item.cantidad,
              precioReal: item.precioElegido ?? 0,
              costoReal: (item.precioElegido ?? 0) * item.cantidad,
              estado: 'en_lista',
            },
          })
        )
    )

    // 3. Ejecutar en transacción
    await prisma.$transaction(actualizaciones)

    return NextResponse.json({
      status: 'ok',
      mensaje: `Se sincronizaron ${actualizaciones.length} ítems correctamente.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno al sincronizar datos reales: ' + String(error) },
      { status: 500 }
    )
  }
}
