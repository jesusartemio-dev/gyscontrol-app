// ===================================================
// Sincronizar datos reales de Listas a ProyectoEquipoCotizadoItem
// Extracted from sync-reales/[id]/route.ts for reusability
// ===================================================

import { prisma } from '@/lib/prisma'

/**
 * Sincroniza cantidadReal, precioReal y costoReal en ProyectoEquipoCotizadoItem
 * basándose en los ítems de ListaEquipoItem asociados al proyecto.
 * @returns Number of items synchronized
 */
export async function sincronizarRealesProyecto(proyectoId: string): Promise<number> {
  // Obtener todas las listas técnicas del proyecto, con ítems asociados a ProyectoEquipoItem
  const listas = await prisma.listaEquipo.findMany({
    where: { proyectoId },
    include: {
      listaEquipoItem: {
        where: { proyectoEquipoItemId: { not: null } },
      },
    },
  })

  // Crear actualizaciones de ProyectoEquipoItem con los datos reales desde la lista
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

  // Ejecutar en transacción
  if (actualizaciones.length > 0) {
    await prisma.$transaction(actualizaciones)
  }

  return actualizaciones.length
}
