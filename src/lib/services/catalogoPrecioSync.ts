import { prisma } from '@/lib/prisma'
import { registrarActualizacion } from '@/lib/services/audit'

/**
 * Propagates the selected cotización price to CatalogoEquipo.precioLogistica.
 * Only updates if catalogoEquipoId exists and the catalog record is found.
 * Includes audit logging for price history tracking.
 */
export async function propagarPrecioLogisticaCatalogo(params: {
  catalogoEquipoId: string | null | undefined
  precioLogistica: number
  userId?: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { catalogoEquipoId, precioLogistica, userId, metadata } = params

  if (!catalogoEquipoId) return

  try {
    const equipo = await prisma.catalogoEquipo.findUnique({
      where: { id: catalogoEquipoId },
      select: { id: true, codigo: true, precioLogistica: true },
    })

    if (!equipo) return

    // Skip if price hasn't changed
    if (equipo.precioLogistica === precioLogistica) return

    const anterior = equipo.precioLogistica

    await prisma.catalogoEquipo.update({
      where: { id: catalogoEquipoId },
      data: { precioLogistica },
    })

    // Audit logging
    if (userId) {
      const cambios = {
        precioLogistica: { anterior, nuevo: precioLogistica },
      }
      registrarActualizacion(
        'CATALOGO_EQUIPO',
        catalogoEquipoId,
        userId,
        `Precio logística actualizado desde cotización: ${equipo.codigo}`,
        cambios,
        { vista: 'logistica', codigo: equipo.codigo, ...metadata }
      ).catch(err => console.error('Audit log error (precioLogistica):', err))
    }
  } catch (error) {
    console.error('Error propagating precioLogistica to catalog:', error)
  }
}
