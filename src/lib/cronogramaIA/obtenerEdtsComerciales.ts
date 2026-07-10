import { prisma } from '@/lib/prisma'

/**
 * EDTs que realmente se vendieron/contrataron en la cotización comercial del
 * proyecto — determinista, cero IA. `CatalogoServicio.catalogoServicioId` en
 * los items de cotización casi nunca está poblado en la práctica (~0.4% en
 * producción), pero `edtId` SÍ es un campo obligatorio en
 * ProyectoServicioCotizado/CotizacionServicioItem — es la fuente confiable.
 *
 * Prioridad: 1) snapshot ya materializado en el proyecto
 * (ProyectoServicioCotizado, se crea al aprobar la cotización — ya viene
 * scoped a proyectoId); 2) si el proyecto no tiene snapshot (por ejemplo
 * fue creado sin pasar por ese flujo), la cotización comercial en vivo
 * (Proyecto.cotizacion.cotizacionServicio). Devuelve null si el proyecto no
 * tiene cotización comercial en absoluto (ej. proyectos internos) — en ese
 * caso el wizard cae a sugerencia por IA (si hay PDF) o selección manual.
 */
export async function obtenerEdtsComercialesProyecto(proyectoId: string): Promise<string[] | null> {
  const snapshot = await prisma.proyectoServicioCotizado.findMany({
    where: { proyectoId },
    select: { edtId: true },
    distinct: ['edtId'],
  })
  if (snapshot.length > 0) {
    return snapshot.map(s => s.edtId)
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      cotizacion: {
        select: {
          cotizacionServicio: { select: { edtId: true }, distinct: ['edtId'] },
        },
      },
    },
  })

  if (proyecto?.cotizacion && proyecto.cotizacion.cotizacionServicio.length > 0) {
    return proyecto.cotizacion.cotizacionServicio.map(s => s.edtId)
  }

  return null
}
