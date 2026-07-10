import { prisma } from '@/lib/prisma'
import type { EvidenciaTexto } from './detectarEdtsPosibles'

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

/**
 * Evidencia textual para detectarEdtsPosibles (mal-tageo de EDT en la
 * cotización) — a diferencia de obtenerEdtsComercialesProyecto, esto
 * necesita el texto real de cada partida (nombre/descripción), que SOLO
 * vive en la cotización comercial EN VIVO (CotizacionServicioItem); el
 * snapshot ProyectoServicioCotizadoItem no tiene un campo de texto libre
 * cuando catalogoServicioId es null (el caso típico). Siempre lee la
 * cotización en vivo, sin importar si hay snapshot o no.
 */
export async function obtenerEvidenciasCotizacion(proyectoId: string): Promise<EvidenciaTexto[]> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      cotizacion: {
        select: {
          cotizacionServicio: {
            select: {
              edt: { select: { nombre: true } },
              cotizacionServicioItem: { select: { nombre: true, descripcion: true } },
            },
          },
        },
      },
    },
  })

  const evidencias: EvidenciaTexto[] = []
  for (const servicio of proyecto?.cotizacion?.cotizacionServicio ?? []) {
    for (const item of servicio.cotizacionServicioItem) {
      const origen = `Partida "${item.nombre}"`
      // Nombre y descripción por separado, con prioridad distinta: el
      // NOMBRE de la partida es una señal intencional fuerte (ej.
      // "DESARROLLO DE PLANOS"); una mención de la palabra clave dentro de
      // una descripción larga (ej. "actualización de planos" dentro de un
      // as-built de Cierre) es mucho más débil y no debe ganarle a un
      // nombre real cuando ambos matchean el mismo EDT.
      if (item.nombre) {
        evidencias.push({ texto: item.nombre, origen, edtActual: servicio.edt.nombre, prioridad: 'alta' })
      }
      if (item.descripcion) {
        evidencias.push({ texto: item.descripcion, origen, edtActual: servicio.edt.nombre, prioridad: 'baja' })
      }
    }
  }
  return evidencias
}
